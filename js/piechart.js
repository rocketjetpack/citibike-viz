// js/piechart.js

let pieChart;

function initPieChart(containerId = 'rideTypeChart') {
  pieChart = Highcharts.chart(containerId, {
    chart: {
      type: 'pie'
    },
    title: { text: '' },
    tooltip: {
      pointFormat: '{series.name}: <b>{point.y}</b>'
    },
    accessibility: {
      point: {
        valueSuffix: ''
      }
    },
    plotOptions: {
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          format: '<b>{point.name}</b>: {point.percentage:.1f} %'
        }
      }
    },
    series: [{
      name: 'Rides',
      colorByPoint: true,
      data: [
        { name: 'Inbound', y: 0 },
        { name: 'Outbound', y: 0 },
        { name: 'Looped', y: 0 }
      ]
    }]
  });
}

export function updatePieChart(rideTypeTotals) {
  // Clear any existing chart
  if (pieChart) {
    clearPieChart();
  }

  // Re-initialize the chart
  initPieChart();

  // Update with new data
  pieChart.series[0].setData([
    { name: 'Inbound', y: rideTypeTotals.inbound },
    { name: 'Outbound', y: rideTypeTotals.outbound },
    { name: 'Looped', y: rideTypeTotals.looped }
  ]);
}

export function clearPieChart() {
  if (pieChart) {
    pieChart.destroy();
    pieChart = null;
  }
}
