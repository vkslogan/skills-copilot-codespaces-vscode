// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const { randomBytes } = require('crypto');
const cors = require('cors');
const app = express();
const axios = require('axios');
const { json } = require('body-parser');

// Middlewares
app.use(bodyParser.json());
app.use(cors());

// Store comments
const commentsByPostId = {};

// Get all comments for a post
app.get('/posts/:id/comments', (req, res) => {
    res.send(commentsByPostId[req.params.id] || []);
});

// Create a comment for a post
app.post('/posts/:id/comments', async (req, res) => {
    // Generate random ID
    const commentId = randomBytes(4).toString('hex');

    // Get comment from request body
    const { content } = req.body;

    // Get comments for post
    const comments = commentsByPostId[req.params.id] || [];

    // Add new comment to comments
    comments.push({ id: commentId, content, status: 'pending' });

    // Update comments for post
    commentsByPostId[req.params.id] = comments;

    // Emit event to event bus
    await axios.post('http://localhost:4005/events', {
        type: 'CommentCreated',
        data: {
            id: commentId,
            postId: req.params.id,
            content,
            status: 'pending'
        }
    });

    // Send response
    res.status(201).send(comments);
});

// Receive events from event bus
app.post('/events', async (req, res) => {
    // Get event from request body
    const { type, data } = req.body;

    // If event type is CommentModerated
    if (type === 'CommentModerated') {
        // Get comment from comments
        const comment = commentsByPostId[data.postId].find(comment => {
            return comment.id === data.id;
        });

        // Update comment status
        comment.status = data.status;

        // Emit event to event bus
        await axios.post('http://localhost:4005/events', {
            type: 'CommentUpdated',
            data: {
                id: data.id,
                postId: data.postId,
                status: data.status,
                content: data.content
            }
        });
    }

    // Send response
    res.send({});
