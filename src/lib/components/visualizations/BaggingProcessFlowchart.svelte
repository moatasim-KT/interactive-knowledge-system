<script>
  // This component uses basic CSS for a flowchart layout.
</script>

<div class="flowchart-container">
  <h3>Bagging Process Flowchart</h3>
  <div class="node">Original Dataset</div>
  <div class="arrow">↓</div>
  <div class="node">Generate B Bootstrap Samples</div>
  <div class="arrow">↓</div>
  <div class="parallel-process">
    <div class="process-item">
      <div class="node">Train Model 1 on Bootstrap Sample 1</div>
    </div>
    <div class="process-item">
      <div class="node">Train Model 2 on Bootstrap Sample 2</div>
    </div>
    <div class="process-item">
      <div class="node">...</div>
    </div>
    <div class="process-item">
      <div class="node">Train Model B on Bootstrap Sample B</div>
    </div>
  </div>
  <div class="arrow">↓</div>
  <div class="node">Combine Predictions (e.g., Averaging/Majority Vote)</div>
  <div class="arrow">↓</div>
  <div class="node final">Bagged Prediction</div>
</div>

<style>
  .flowchart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  .node {
    border: 2px solid #007bff;
    padding: 10px 20px;
    margin: 10px 0;
    border-radius: 5px;
    background-color: #e7f3ff;
    font-weight: bold;
    text-align: center;
    min-width: 200px;
  }
  .node.final {
    background-color: #28a745;
    color: white;
    border-color: #28a745;
  }
  .arrow {
    font-size: 24px;
    color: #007bff;
    margin: 5px 0;
  }
  .parallel-process {
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin: 10px 0;
    flex-wrap: wrap;
    gap: 10px;
  }
  .process-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
</style>