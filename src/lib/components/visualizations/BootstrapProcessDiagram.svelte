<script>
  // This component would ideally use a library like D3.js or Konva.js for interactive animations.
  // For demonstration, we'll use basic SVG to illustrate the flow.
</script>

<div class="bootstrap-diagram">
  <h3>Bootstrap Sampling Process</h3>
  <div class="step">
    <div class="box">Original Dataset (D)</div>
    <div class="arrow">↓</div>
  </div>
  <div class="step">
    <div class="box">Random Sampling with Replacement (n times)</div>
    <div class="arrow">↓</div>
  </div>
  <div class="step-group">
    <div class="step-item">
      <div class="box">Bootstrap Sample 1 (D*1)</div>
    </div>
    <div class="step-item">
      <div class="box">Bootstrap Sample 2 (D*2)</div>
    </div>
    <div class="step-item">
      <div class="box">...</div>
    </div>
    <div class="step-item">
      <div class="box">Bootstrap Sample B (D*B)</div>
    </div>
  </div>
  <p class="note">Each bootstrap sample has the same size as the original dataset, with some elements repeated and some omitted.</p>
</div>

<style>
  .bootstrap-diagram {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    padding: 20px;
    border: 1px solid #eee;
    border-radius: 8px;
    background-color: #f9f9f9;
  }
  .step {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 10px;
  }
  .box {
    border: 1px solid #333;
    padding: 10px 15px;
    border-radius: 5px;
    background-color: #fff;
    font-weight: bold;
    text-align: center;
  }
  .arrow {
    font-size: 24px;
    color: #555;
    margin: 5px 0;
  }
  .step-group {
    display: flex;
    justify-content: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .note {
    margin-top: 15px;
    font-style: italic;
    color: #666;
    text-align: center;
  }
</style>