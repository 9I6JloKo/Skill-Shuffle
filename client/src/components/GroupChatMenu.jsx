import React, { useState, useEffect } from 'react';
import { Row, Col, Container, Image, Stack, Button, NavLink } from 'react-bootstrap';
import axios from 'axios';

import UploadChatAvatarModal from './UploadChatAvatarModal';
import { API_SERVER } from '../config';

import { ReactComponent as NetworkIcon } from '../assets/icons/network.svg';
import { ReactComponent as Plus } from '../assets/icons/plus.svg';
import { ReactComponent as Search } from '../assets/icons/search-icon.svg';
import { ReactComponent as Cross } from '../assets/icons/cross-icon.svg';
import imagePlaceholder from '../assets/icons/image-placeholder.svg';

function GroupChatMenu({ chat }) {
    const [showModal, setShowModal] = useState(false);
    const [imageURL, setImageURL] = useState(chat.avatarUrl || null);
    const [imageBlob, setImageBlob] = useState(null);
    const [filteredMembers, setFilteredMembers] = useState(chat.members);
    const [search, setSearch] = useState('');
    const [searchMemberVisibility, setSearchMemberVisibility] = useState('');

    const handleMemberFilter = (e) => {
        // Filter members based on the role
        const filter = e.target.getAttribute('data-role');
        setFilteredMembers(chat.members.filter(member => member.role === filter || member.role === 'creator'));

        // Remove active class from all buttons
        document.querySelectorAll('.members-filter button').forEach(button => button.classList.remove('active'));
        e.target.classList.add('active');
    };

    const handleMemberSearch = () => {
        if (search === '') {
            setFilteredMembers(chat.members);
            return;
        }
        setFilteredMembers(chat.members.filter(member => {
            return member.firstName.toLowerCase().includes(search.toLowerCase())
                || member.lastName.toLowerCase().includes(search.toLowerCase())
        }));
    };

    const formatLastSeenTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        const currentDate = new Date();
        const difference = currentDate - date;

        // dd/mmm/yyyy if the message was sent more than a year ago
        // dd/mmm if the message was sent less than a year ago but more than a day ago
        // hh:mm if the message was sent less than a day ago and more than an hour ago
        // mm ago if message was sent more than 5 minutes
        // If the message was sent less than 5 minutes ago then return 'Online'

        if (difference > 31536000000) {
            return `last seen ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        } else if (difference > 86400000) {
            return `last seen ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
        } else if (difference > 3600000) {
            return `last seen at ${date.toLocaleTimeString('en-GB', { hour: 'numeric', minute: 'numeric' })}`;
        } else if (difference > 300000) {
            return `last seen ${Math.floor(difference / 60000)} minutes ago`;
        } else {
            return 'Online';
        }
    }

    const handleOpenModal = () => {
        setShowModal(true);
    };

    // Get the imageBlob from the modal and send it to the server
    useEffect(() => {
        if (imageBlob !== null) {
            const formData = new FormData();
            formData.append('avatarBlob', imageBlob);

            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                withCredentials: true
            };

            axios.patch(`${API_SERVER}/chats/${chat.id}/avatar`, formData, config)
                .then(response => {
                    setImageURL(response.data.avatarUrl);
                })
                .catch(error => {
                    console.error(error);
                });
        }
    }, [imageBlob, chat.id]);

    return (
        <Container className='group-menu d-flex flex-column'>

            <UploadChatAvatarModal
                showModal={showModal}
                setShowModal={setShowModal}
                setImageURL={setImageURL}
                setImageBlob={setImageBlob}
            />

            <Row className='chat-header d-flex justify-content-start py-3 px-4'>
                <Col className='me-4 chat-avatar' xs lg={2}>
                    <Image
                        src={imageURL || imagePlaceholder}
                        alt='Chat'
                        width='80'
                        height='80'
                        role='button'
                        className='rounded-circle object-fit-cover'
                    />
                    <div className="img-overlay d-flex align-items-center justify-content-center w-100 h-100 position-absolute top-0 rounded-circle" onClick={handleOpenModal}>
                        <Plus width={30} height={30} />
                    </div>
                </Col>
                <Col xs>
                    <p className='chat-name'>{chat.name}</p>
                    <p className='members-count'>{chat.members.length} members</p>
                </Col>
            </Row>

            <Row className='members-filter d-flex justify-content-start align-items-center position-relative ps-3'>
                {!searchMemberVisibility ? (
                    <>
                        <Button variant='light' className='all-members active' data-role='member' onClick={handleMemberFilter}>
                            All members <span className='ms-2'>{chat.members.length}</span>
                        </Button>

                        <Button variant='light' className='admins' data-role='admin' onClick={handleMemberFilter}>
                            Administrators
                            <span className='ms-2'>{chat.members.filter(member => member.role === 'admin' || member.role === 'creator').length}</span>
                        </Button>

                        <Col className='d-flex justify-content-end align-items-center'>
                            <Button variant='none' className='icon-btn search-btn px-3' onClick={() => setSearchMemberVisibility(true)}>
                                <Search className='search-icon' width={22} height={22} />
                            </Button>
                        </Col>
                    </>
                ) : (
                    <>
                        <input
                            type='text'
                            placeholder='Enter member’s name or surname'
                            className='border-0'
                            autoFocus={true}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyUp={() => handleMemberSearch()}
                        />
                        <Button
                            variant='none'
                            className='icon-btn cross-btn px-3'
                            onClick={() => {
                                setSearchMemberVisibility(false);
                                setSearch('');
                                setFilteredMembers(chat.members);
                            }}
                        >
                            <Cross className='cross-icon' width={10} height={10} />
                        </Button>
                    </>
                )}
            </Row>

            <Row className='add-members px-3'>
                <Button variant='light' className='d-flex align-items-center px-0 py-2'>
                    <div className='rounded-circle d-flex justify-content-center align-items-center'>
                        <Plus width={22} height={22} />
                    </div>
                    <span className='ms-2'>Add members</span>
                </Button>
            </Row>

            <Stack className='member-list flex-grow-1' direction='vertical' gap={0}>
                {filteredMembers.map((member, index) => (
                    <NavLink
                        key={index}
                        href={`/users?nn=${member.nickname}`}
                        className="member-container d-flex align-items-center m-0 py-2 px-3"
                    >
                        <div className="member-info w-100 d-flex align-items-center px-0">
                            <Image
                                src={member.avatarUrl !== null ? member.avatarUrl : imagePlaceholder}
                                alt={'Member'}
                                width='55'
                                height='55'
                                style={{ objectFit: 'cover' }}
                                roundedCircle
                            />
                            <div className='d-flex flex-column w-100 ms-3'>
                                <div className='d-flex flex-row'>
                                    <div className="member-name w-75">
                                        <span>{member.firstName} {member.lastName}</span>
                                    </div>
                                    {member.role === 'creator' || member.role === 'admin' ? (
                                        <Col className="member-role w-25 d-flex justify-content-end align-items-center">
                                            <span>{member.role === 'creator' ? 'Creator' : 'Administrator'}</span>
                                        </Col>
                                    ) : null}
                                </div>
                                <div className='member-activity d-flex align-items-center justify-content-start flex-row'>
                                    {formatLastSeenTimestamp(member.lastSeen) === 'Online' ? (
                                        <>
                                            <div className="online-icon rounded-circle"></div>
                                            <span>Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <NetworkIcon width={13} height={13} />
                                            <span>{formatLastSeenTimestamp(member.lastSeen)}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </NavLink>
                ))}
            </Stack>

        </Container>
    )
}

export default GroupChatMenu