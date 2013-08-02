define(['app'], function(app) {
  return describe('Create scaling group :: sets default features', function() {
      it('should create a scaling group', function() {
          waitsFor(function() {
              return $('.resources-nav > li:nth-child(3) > a').size() > 0;
          });

          runs(function() {
              $('.resources-nav > li:nth-child(3) > a').click();
          });

          waitsFor(function() {
              return $('.resources-nav > li:nth-child(3) ul li:nth-child(2) > a').size() > 0;
          });

          runs(function() {
              return $('.resources-nav > li:nth-child(3) ul li:nth-child(2) > a').click();
          });

          waitsFor(function() {
              return $('#table-scaling-new').size() > 0;
          });

          runs(function() {
              $('#table-scaling-new').click();
          });

          waitsFor(function() {
              return $('#new-scaling-group input[name="name"]').size() > 0;
          });

          runs(function() {
              $('#new-scaling-group input[name="name"]').val('TEMP SCALING GROUP').trigger('change');
              $('#new-scaling-group select#launchConfig').val(app.data.scalinggrp.at(0).get('name')).trigger('change');
              $('#new-scaling-group input#maximum').val(2).trigger('change');
              $('#new-scaling-group input#desired').val(1).trigger('change');
              $('#new-scaling-group input#minimum').val(1).trigger('change');
              $('#new-scaling-group button#nextButton').click();
          });

          waits(500);

          runs(function() {
              $('#new-scaling-group select#healthCheckType').val('EC2').trigger('change');
              $('#new-scaling-group div[data-tooltip="create_scaling_group_memb_az_tip"] select').val($('#new-scaling-group div[data-tooltip="create_scaling_group_memb_az_tip"] select option:eq(1)').attr('value')).trigger('change');
              $('#new-scaling-group div[data-tooltip="create_scaling_group_memb_az_tip"] .icon_add').click();
              $('#new-scaling-group button#nextButton').click();
          });
      });
  });
});
