define([
    'jasmine-html'
    ], 
function(jasmine){
    var jasmineEnv = jasmine.getEnv();
    jasmineEnv.updateInterval = 1000;

    var htmlReporter = new jasmine.HtmlReporter();

    jasmineEnv.addReporter(htmlReporter);

    jasmineEnv.specFilter = function(spec) {
        return htmlReporter.specFilter(spec);
    };

    var specs = [];

    specs.push('../lib/test/spec/spec1');
    specs.push('../lib/test/spec/createalarm');

    $(function() {
        require(specs, function(){
            execJasmine();
        });
    });

    function execJasmine() {
        jasmineEnv.execute();
        requireCSS('../lib/test/jasmine.css');

        $('#HTMLReporter').css('position', 'absolute');
        $(document).ready(function() {
            var $dragging = null;

            $(document.body).on("mousemove", function(e) {
                if ($dragging) {
                    $('#HTMLReporter').offset({
                        top: e.pageY - 20,
                        left: e.pageX - 20
                    });
                }
            });

            $(document.body).on("mousedown", "#HTMLReporter", function (e) {
                $dragging = $(e.target);
            });

            $(document.body).on("mouseup", function (e) {
                $dragging = null;
            });
        });
    }

    return jasmineEnv;
});
