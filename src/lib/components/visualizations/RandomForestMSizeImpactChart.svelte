<script>
  let chartContainer;
  let chart;

  // Placeholder data for demonstration
  const data = {
    labels: ['m=1', 'm=sqrt(p)', 'm=p/2', 'm=p'], // p is total features
    datasets: [
      {
        label: 'Error Rate (Simulated)',
        data: [0.25, 0.10, 0.12, 0.18], // Simulated error rates
        backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56'],
        borderColor: 'rgba(0,0,0,0)',
        borderWidth: 1
      }
    ]
  };

  $effect(async () => {
    const Chart = (await import('chart.js/auto')).default;

    chart = new Chart(chartContainer, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Impact of Feature Subset Size (m) on Random Forest Error Rate'
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                const mValue = context[0].label;
                if (mValue === 'm=sqrt(p)') return 'Optimal m (typically)';
                return mValue;
              },
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                label += context.raw + '%';
                return label;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Error Rate'
            }
          },
          x: {
            title: {
              display: true,
              text: 'Feature Subset Size (m)'
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