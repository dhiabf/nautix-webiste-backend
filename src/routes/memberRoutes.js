const express = require('express');
const { getMembers, addMember, editMember, deleteMember } = require('../controllers/memberController');

const router = express.Router();

router.get('/', getMembers);
router.post('/', addMember);
router.put('/:id', editMember);
router.delete('/:id', deleteMember);

module.exports = router;
