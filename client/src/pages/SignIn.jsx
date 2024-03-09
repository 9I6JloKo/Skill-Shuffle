import React, { useState } from 'react';
import { Container, Form, Button } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

function SignIn() {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const login = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:8080/api/auth/sign-in', { username, password })
                .then((response) => {
                    const authUser = {
                        'username': username,
                        'password': password,
                        'jwtToken': response.data.jwtToken
                    };
                    sessionStorage.setItem('authUser', JSON.stringify(authUser));
                    navigate('/chat');
                });
        } catch (error) {
            if (error.response) {
                console.error(error.response.data.message);
            }
        }
    }

    return (
        <Container className='d-flex justify-content-center align-items-center'>
            <Form onSubmit={login}>
                <Form.Group controlId='formBasicUsername'>
                    <Form.Control type='text' name='username' placeholder='Username' 
                        onChange={e => setUsername(e.target.value)} autoComplete='username' />
                </Form.Group>

                <Form.Group controlId='formBasicPassword'>
                    <Form.Control type='password' name='password' placeholder='Password' 
                        onChange={e => setPassword(e.target.value)} autoComplete='current-password' />
                </Form.Group>

                <Button variant='primary' type='submit'>
                    Sign In
                </Button>

                <Form.Text className='text-muted'>
                    Don't have an account? <Link to='/sign-up'>Sign Up</Link>
                </Form.Text>
            </Form>
        </Container>
    )
}

export default SignIn