package com.dzalex.skillshuffle.controllers;

import com.dzalex.skillshuffle.dtos.ChatDTO;
import com.dzalex.skillshuffle.services.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class ChatController {

    @Autowired
    private ChatService chatService;

    @GetMapping("/im")
    public List<ChatDTO> getChats() {
        return chatService.getChatListWithLastMessage();
    }
}