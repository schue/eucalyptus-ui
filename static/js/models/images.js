define([
    'models/eucacollection',
    'models/image',
    'workers/search',
], function(EucaCollection, Image, Search) {
    var Images = EucaCollection.extend({
	    model: Image,
        filters: [
            {
                name: 'architecture',
                label: 'Architecture',
                type: Search.LIST_MATCH,
                values: [
                    {label: 'i386', value: 'i386'}, 
                    {label: 'x86_64', value: 'x86_64'}
                ]
            },
            {
                name: 'description',
                label: 'Description',
                type: Search.STRING_MATCH
            },
        ],
	    url: '/ec2?Action=DescribeImages',
    });
    return Images;
});
