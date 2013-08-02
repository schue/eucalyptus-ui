define(['app', 'models/scalinggrp'], function(app, ScalingGroup) {
    return describe('CreateAlarm :: main', function() {
        var ALARM_NAME = '__TEST_ALARM__';
        var fetchWorker;
        var alarm;

        afterEach(function() {
            var alarm = app.data.alarms.findWhere({name: ALARM_NAME});
            console.log('DESTROY', alarm);
            if (alarm != null) alarm.destroy();
        });

        it('should create an alarm', function() {
            var scalingGroup = app.data.scalinggrp.at(0);
            app.dialog('create_alarm', {scalingGroup: scalingGroup});

            waits(1000);

            runs(function() {
                $('input#alarm-name').val(ALARM_NAME).trigger('change');
                $('select#alarm-metric').val('AWS/AutoScaling - Group desired capacity').trigger('change');
                $('select#alarm-dimension:visible').val('ThisScalingGroupName').trigger('change');
                $('select#alarm-statistic').val('Average').trigger('change');
                $('select#alarm-comparison').val('GreaterThanThreshold').trigger('change');
                $('input#alarm-trigger').val(10).trigger('change');
                $('input#alarm-period').val(60).trigger('change');
                $('input#alarm-measurement').val(2).trigger('change');
                $('button#button-dialog-createalarm-save').click();
            });
        });

        describe('CreateAlarm :: check values', function() {
            it('should see the alarm come back', function() {
                runs(function() {
                    fetchWorker = setInterval(function() {
                        console.log('Check for alarm');
                        app.data.alarms.fetch();
                    }, 2000);
                });

                waitsFor(function() {
                    return app.data.alarms.findWhere({name: ALARM_NAME}) != null;
                }, 'An alarm should be created', 60000);
                
                runs(function() {
                    clearInterval(fetchWorker);
                    alarm = app.data.alarms.findWhere({name: ALARM_NAME});
                });
            });

            it('should have a matching namespace', function() {
                expect(alarm.get('namespace')).toBe('AWS/AutoScaling');
            });

            it('should have a matching metric', function() {
                expect(alarm.get('metric')).toBe('GroupDesiredCapacity');
            });

            it('should have a matching comparison', function() {
                expect(alarm.get('comparison')).toBe('>');
            });

            it('should have a matching evaluation period', function() {
                expect(alarm.get('evaluation_periods')).toBe(2);
            });

            it('should have a matching period', function() {
                expect(alarm.get('period')).toBe(60);
            });

            it('should have a matching threshold', function() {
                expect(alarm.get('threshold')).toBe(10);
            });
        });
    });
});
