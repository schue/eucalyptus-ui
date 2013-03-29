var vows = require ( 'vows' ),
        util = require ( 'util' ),
        assert = require ( 'assert' );

console.log ( "CWD: " + process.cwd () );

var Injector = require ( '../static/js/injector' );

console.log ( "INJECTOR: " + util.inspect ( Injector ) );

var counter = 1;

var testSuite = vows.describe ( 'Injectors' ).addBatch ( {
    'A new module': {
        topic: function () {
            var injector = new Injector();
            function moduleOne () {
                return 'Hello';
            }
            function moduleTwo ( a ) {
                return a + ' World'
            }
            injector.module ( 'a', moduleOne );
            injector.module ( 'b', moduleTwo );
            // this.callback is a Vows callback for asynchronous tests - 
            // it is invoked with the result
            var cb = this.callback;
            injector.load ( 'b', null, function ( res ) {
                // Vows callback expects err,result
                cb ( null, res );
            }, {} );
            console.log ( "MODULES" );
        },
        'is an empty': function ( result ) {
            if (util.isError ( result )) {
                console.log ( result.stack );
            }
            console.log ( "GOT RESULT " + result );
            assert.equal ( result, 'Hello World' );
        }
    }
} ).addBatch ( {
    'Nested modules': {
        topic: function () {
            var injector = new Injector();
            injector.module ( 'zeroth', function () {
                return 'Dependency'
            } );
            injector.module ( 'first', function ( zeroth ) {
                return zeroth + ' injection'
            } );
            injector.module ( 'second', function () {
                return 'is';
            } );
            injector.module ( 'third', function () {
                return 'cool';
            } );
            injector.module ( 'final', function ( first, second, third ) {
                return [first, second, third].join ( ' ' );
            } );
            var cb = this.callback;
            injector.load ( 'final', null, function ( res ) {
                cb ( null, res );
            } );
        },
        'are all invoked': function ( result ) {
            console.log ( "RESULT IS " + result );
            assert.equal ( result, 'Dependency injection is cool' );
        }
    }
} ).addBatch ( {
    'Cached results': {
        topic: function () {
            var injector = new Injector();
            injector.module ( 'increments', function () {
                var v = ++counter;
                console.log ( "V NOW " + v );
                return v;
            }, true );
            var cb = this.callback;
            injector.load ( 'increments', null, function ( res ) {
                console.log ( "a " + res );
                // Vows callback expects err,result
                injector.load ( 'increments', null, function ( res ) {
                    console.log ( "b " + res);
                    // Vows callback expects err,result
                    injector.load ( 'increments', null, function ( res ) {
                        console.log ( "c " + res );
                        // Vows callback expects err,result
                        cb ( null, res );
                    }, {} );
                }, {} );
            }, {} );
        },
        'are cached' : function (value) {
            if (util.isError ( value )) {
                console.log ( value.stack );
            }
            console.log ( "VLAUE IS " + value.toString() + " typeof " + typeof value );
            assert.typeOf(value, 'number')
            assert.equal(value, 2);
        }
    }
} );

module.exports = testSuite;
if (require.main === module) {
    testSuite.run ( {}, function () {
        console.log ( "Done injectorTest" );
    } );
}
