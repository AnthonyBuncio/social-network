const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const passport = require('passport');

// Input validation
const validatePostInput = require('../../validation/post')

// Import post model
const Post = require('../../models/Post')
const Profile = require('../../models/Profile')

router.get('/test', (req, res) => res.json({msg: "Posts work"}));

// @route   POST
// @desc    Create post
router.post('/', passport.authenticate('jwt', {session: false}), (req, res) => {
    const {errors, isValid} = validatePostInput(req.body);

    if (!isValid) {
        return res.status(400).json(errors);
    }

    const newPost = new Post({
        text: req.body.text,
        name: req.body.name,
        avatar: req.body.avatar,
        user: req.user.id
    });

    newPost.save()
        .then(post => res.json(post))
        .catch(err => res.status(404).json(err))
});

// @route   GET
// @desc    Get all posts
router.get('/', (req, res) => {
    Post.find()
        .sort({date: -1})
        .then(posts => res.json(posts))
        .catch((err) => res.status(404).json({ nopostsfound: 'No posts found' }))
});

// @route   GET
// @desc    Get a single post
router.get('/:id', (req, res) => {
    Post.findById(req.params.id)
        .then(post => res.json(post))
        .catch((err) => res.status(404).json({ nopostsfound: 'No post found with that ID' }))
});

// @route   DEL
// @desc    Delete post
router.delete('/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
    Profile.findOne({user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check if post belongs to current user
                    if(post.user.toString() !== req.user.id) {
                        return res.status(401).json({notauthorized: 'User not authorized'})
                    }
                    post.remove()
                        .then(() => res.json({success: true}))
                })
                .catch(err => res.status(404).json({postnotfound: 'No post found'}))
        })
});

// @route   POST
// @desc    Add like
router.post('/like/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
    Profile.findOne({user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check if current user has liked the post already
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length > 0) {
                        return res.status(400).json({alreadyliked: 'User already liked this post'})
                    }
                    post.likes.unshift({user: req.user.id});
                    post.save()
                        .then(post => res.json(post))
                })
                .catch(err => res.status(404).json({postnotfound: 'No post found'}))
        })
});

// @route   POST
// @desc    Remove like (unlike)
router.post('/unlike/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
    Profile.findOne({user: req.user.id})
        .then(profile => {
            Post.findById(req.params.id)
                .then(post => {
                    // Check if current user has liked the post already
                    if(post.likes.filter(like => like.user.toString() === req.user.id).length === 0) {
                        return res.status(400).json({notliked: 'You have not liked this post'})
                    }
                    const removeIndex = post.likes
                        .map(item => item.user.toString())
                        .indexOf(req.user.id);
                    
                    post.likes.splice(removeIndex, 1)
                    post.save()
                        .then(post => res.json(post))
                })
                .catch(err => res.status(404).json({postnotfound: 'No post found'}))
        })
});

// @route   POST
// @desc    Add comment to post
router.post('/comment/:id', passport.authenticate('jwt', {session: false}), (req, res) => {
    const {errors, isValid} = validatePostInput(req.body);

    if (!isValid) {
        return res.status(400).json(errors);
    }

    Post.findById(req.params.id)
        .then(post => {
            const newComment = {
                text: req.body.text,
                name: req.body.name,
                avatar: req.body.avatar,
                user: req.user.id
            }

            post.comments.unshift(newComment);
            post.save()
                .then(post => res.json(post))
        })
        .catch(err => res.status(404).json({postnotfound: 'No post found'}))
});

// @route   DEL
// @desc    Delete comment
router.delete('/comment/:id/:comment_id', passport.authenticate('jwt', {session: false}), (req, res) => {
    Post.findById(req.params.id)
        .then(post => {
            if(post.comments.filter(comment => comment._id.toString() === req.params.comment_id).length === 0) {
                return res.status(404).json({commentnotexists: 'Comment not found'})
            }

            const removeIndex = post.comments
                .map(item => item._id.toString())
                .indexOf(req.params.comment_id)

            post.comments.splice(removeIndex, 1)
            post.save()
                .then(post => res.json(post))
        })
        .catch(err => res.status(404).json({postnotfound: 'No post found'}))
});

module.exports = router;