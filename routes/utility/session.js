module.exports.getSessionID = (req) => {
	return req.session.member.ID;
}
