<script>
  let chartContainer;
  let chart;

  // Placeholder data for demonstration
  const data = {
    labels: ['1 Estimator', '2 Estimators', '5 Estimators', '10 Estimators', '20 Estimators'],
    datasets: [
      {
        label: 'Variance',
        data: [1.0, 0.5, 0.2, 0.1, 0.05], // Simulated decreasing variance
        borderColor: 'blue',
        fill: false,
        tension: 0.1
      }
    ]
  };

  $effect(async () => {
    // Dynamically import Chart.js (assuming it's available in the project)
    const Chart = (await import('chart.js/auto')).default;

    chart = new Chart(chartContainer, {
      type: 'line',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Variance Reduction by Averaging Estimators'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Variance'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Number of Estimators Averaged'
            }
          }
        }
      }
    });
  });
</script>

<div style="width: 100%; height: 400px;">
  <canvas bind:this={chartContainer}></canvas>
</div>

<style>
  div {
    margin-bottom: 20px;
  }
</style>