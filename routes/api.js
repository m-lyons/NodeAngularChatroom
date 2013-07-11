/*
 * Serve JSON to our AngularJS client
 */

exports.name = function (req, res) {
  res.json({
  	name: 'Bob'
  });
};

exports.user = function (req, res) {
    res.json({
        user: { name: req.user.username, role: req.user.role }
    });
};