define([], function() {
  console.log('SPEC1: Defined');
  return describe('SPEC1 :: Simple non-test', function() {
    console.log('SPEC1: Start');

    it('has a simple spec', function() {
        expect(true).toBe(true);
    });
 
    console.log('SPEC1: End');
  });
});
