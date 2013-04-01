define([
    'models/eucacollection',
    'models/image'
], function(EucaCollection, Image) {
    var Images = EucaCollection.extend({
	    model: Image,
	    url: '/ec2?Action=DescribeImages',
    });
    return Images;
});
