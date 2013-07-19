// alarm model
//

define([
    './eucamodel'
], function(EucaModel) {
    var model = EucaModel.extend({
        sync: function(method, model, options){
          if(method == 'create' || method == 'update'){
            var url = "/monitor?Action=PutMetricAlarm";
            var parameter = "_xsrf="+$.cookie('_xsrf');

            parameter += "&AlarmName="+encodeURIComponent(this.get('AlarmName'));

            if (this.get('AlarmDescription')) {
              parameter += "&AlarmDescription="+encodeURIComponent(this.get('AlarmDescription'));
            }

            if (this.get('ComparisonOperator')) {
              parameter += "&ComparisonOperator="+encodeURIComponent(this.get('ComparisonOperator'));
            }

            if (this.get('Threshold')) {
              parameter += "&Threshold="+encodeURIComponent(this.get('Threshold'));
            }

            if (this.get('EvaluationPeriods')) {
              parameter += "&EvaluationPeriods="+encodeURIComponent(this.get('EvaluationPeriods'));
            }
            
            if (this.get('Namespace')) {
              parameter += "&Namespace="+encodeURIComponent(this.get('Namespace'));
            }

            if (this.get('MetricName')) {
              parameter += "&MetricName="+encodeURIComponent(this.get('MetricName'));
            }

            if (this.get('Period')) {
              parameter += "&Period="+encodeURIComponent(this.get('Period'));
            }

            if (this.get('Statistic')) {
              parameter += "&Statistic="+encodeURIComponent(this.get('Statistic'));
            }

            if (this.get('alarm_actions')) {
              $.each(this.get('alarm_actions'), function(idx, action) {
                parameter += "&AlarmAction.member." + (idx+1) + "=" + action;
              });
            } 

            this.makeAjaxCall(url, parameter, options);
          }
          else if(method == 'delete'){
            var url = "/monitor?Action=DeleteAlarms";
            var id = this.get('id');
            var parameter = "_xsrf="+$.cookie('_xsrf')+"&AlarmNames.member.0=" +
                encodeURIComponent(this.get('name'));
            this.makeAjaxCall(url, parameter, options);
          }
        },
    });
    return model;
});
