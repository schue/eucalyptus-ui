// load balancers
//

define([
    './eucamodel'
], function(EucaModel) {
    var model = EucaModel.extend({
        idAttribute: 'name'
    });
    return model;
});
