$(document).ready(function() {
    $('#content').height($(window).height()-40);
    $('#right').height($(window).height()-140);
});

$(window).resize(function() {
    $('#content').height($(window).height()-40);
    $('#right').height($(window).height()-140);
});
