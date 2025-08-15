<script>
  import VarianceReductionChart from '../../lib/components/visualizations/VarianceReductionChart.svelte';
  import BootstrapProcessDiagram from '../../lib/components/visualizations/BootstrapProcessDiagram.svelte';
  import BaggingProcessFlowchart from '../../lib/components/visualizations/BaggingProcessFlowchart.svelte';
  import RandomForestMSizeImpactChart from '../../lib/components/visualizations/RandomForestMSizeImpactChart.svelte';
</script>

<style>
  .article-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
    line-height: 1.6;
  }

  h1, h2, h3 {
    color: #333;
    margin-top: 30px;
    margin-bottom: 15px;
  }

  p {
    margin-bottom: 10px;
  }

  .visualization-section {
    margin-top: 40px;
    margin-bottom: 40px;
    padding: 20px;
    background-color: #f0f0f0;
    border-radius: 8px;
  }
</style>

<div class="article-container">
  <h1>Bagging and Random Forests</h1>

  <p>This article explores the concepts of Bagging and Random Forests, powerful ensemble learning techniques used in machine learning to improve prediction accuracy and reduce overfitting. We will delve into the benefits of averaging, the role of bootstrapping, and how Random Forests enhance Bagging by decorrelating trees.</p>

  <h2>The Benefits of Averaging</h2>
  <p>A Lousy Estimator Let Z,Z1,...,Zn i.i.d. EZ = µ and VarZ = σ2. We could use any single Zi to estimate µ. Performance? Unbiased: EZi = µ. Standard error of estimator would be σ. The standard error is the standard deviation of the sampling distribution of a statistic. SD(Z) = pVar(Z) = √ σ2 = σ.
  Variance of a Mean Let Z,Z1,...,Zn i.i.d. EZ = µ and VarZ = σ2. Let's consider the average of the Zi 's. Average has the same expected value but smaller standard error: E " 1 n n X i=1 Zi # = µ Var " 1 n n X i=1 Zi # = σ2 n . Clearly the average is preferred to a single Zi as estimator. Can we apply this to reduce variance of general decision functions?
  Averaging Independent Prediction Functions Suppose we have B independent training sets from the same distribution. Learning algorithm gives B decision functions: f1(x), f2(x),...,fB(x) Define the average prediction function as: f avg = 1 B B X b=1 f b What's random here?
  Averaging Independent Prediction Functions Fix some x ∈ X. Then average prediction on x is f avg(x) = 1 B B X b=1 f b(x). Consider favg(x) and f 1(x),...,fB(x) as random variables (since training data random). f 1(x),...,fB(x) are i.i.d. f avg(x) and f b(x) have the same expected value, but f avg(x) has smaller variance: Var(favg(x)) = 1 B Var f 1(x)
  Averaging Independent Prediction Functions Using f avg = 1 B B X b=1 f b seems like a win. But in practice we don't have B independent training sets... Instead, we can use the bootstrap....</p>

  <div class="visualization-section">
    <h3>Visualization: Variance Reduction by Averaging Estimators</h3>
    <VarianceReductionChart />
  </div>

  <h2>Review: Bootstrap</h2>
  <p>The Bootstrap Sample Definition A bootstrap sample from Dn is a sample of size n drawn with replacement from Dn. In a bootstrap sample, some elements of Dn will show up multiple times, some won't show up at all. Each Xi has a probability (1-1/n)n of not being selected. Recall from analysis that for large n, 1- 1 n n ≈ 1 e ≈ .368. So we expect ~63.2% of elements of D will show up at least once.
  The Bootstrap Method Definition A bootstrap method is when you simulate having B independent samples from P by taking B bootstrap samples from the sample Dn. Given original data Dn, compute B bootstrap samples D1 n,...,DB n . For each bootstrap sample, compute some function φ(D1 n),...,φ(DB n ) Work with these values as though D1 n,...,DB n were i.i.d. P. Amazing fact: Things often come out very close to what we'd get with independent samples from P.</p>

  <div class="visualization-section">
    <h3>Visualization: Bootstrap Sampling Process</h3>
    <BootstrapProcessDiagram />
  </div>

  <h2>Bagging</h2>
  <p>Bagging Draw B bootstrap samples D1,...,DB from original data D. Let f1, f2,...,fB be the decision functions for each set. The bagged decision function is a combination of these: f avg(x) = Combine f 1(x), f2(x),...,fB(x) How might we combine decision functions for regression? binary class predictions? binary probability predictions? multiclass predictions? Bagging proposed by Leo Breiman (1996).
  Bagging for Regression Draw B bootstrap samples D1,...,DB from original data D. Let f1, f2,...,fB : X → R be the predictions functions for each set. Bagged prediction function is given as f bag(x) = 1 B B X b=1 f b(x). Empirically, fbag often performs similarly to what we'd get from training on B independent samples: f bag(x) has same expectation as f1(x), but f bag(x) has smaller variance than f1(x)
  Out-of-Bag Error Estimation Each bagged predictor is trained on about 63% of the data. Remaining 37% are called out-of-bag (OOB) observations. For ith training point, let Si = b | Db does not contain ith point . The OOB prediction on xi is f OOB(xi ) = 1 |Si | X b∈Si f b(x). The OOB error is a good estimate of the test error. OOB error is similar to cross validation error – both are computed on training set.
  Bagging Classification Trees Input space X = R5 and output space Y = {-1,1}. Sample size N = 30 (simulated data)
  Comparing Classification Combination Methods Two ways to combine classifications: consensus class or average probabilities.
  Terms “Bias” and “Variance” in Casual Usage (Warning! Confusion Zone!) Restricting the hypothesis space F “biases” the fit towards a simpler model and away from the best possible fit of the training data. Full, unpruned decision trees have very little bias. Pruning decision trees introduces a bias. Variance describes how much the fit changes across different random training sets. If different random training sets give very similar fits, then algorithm has high stability. Decision trees are found to be high variance (i.e. not very stable).
  Conventional Wisdom on When Bagging Helps Hope is that bagging reduces variance without making bias worse. General sentiment is that bagging helps most when Relatively unbiased base prediction functions High variance / low stability i.e. small changes in training set can cause large changes in predictions Hard to find clear and convinving theoretical results on this But following this intuition leads to improved ML methods, e.g. Random Forests</p>

  <div class="visualization-section">
    <h3>Visualization: Bagging Process Flowchart</h3>
    <BaggingProcessFlowchart />
  </div>

  <h2>Random Forests</h2>
  <p>Recall the Motivating Principal of Bagging Averaging f1,...,fB reduces variance, if they're based on i.i.d. samples from PX×Y Bootstrap samples are independent samples from the training set, but are not indepedendent samples from PX×Y. This dependence limits the amount of variance reduction we can get. Would be nice to reduce the dependence between fi 's...
  Variance of a Mean of Correlated Variables For Z,Z1,...,Zn i.i.d. with EZ = µ and VarZ = σ2, E " 1 n n X i=1 Zi # = µ Var " 1 n n X i=1 Zi # = σ2 n . What if Z's are correlated? Suppose ∀i 6= j, Corr(Zi ,Zj ) = ρ . Then Var " 1 n n X i=1 Zi # = ρσ2 + 1-ρ n σ2. For large n, the ρσ2 term dominates – limits benefit of averaging.
  Random Forest Main idea of random forests Use bagged decision trees, but modify the tree-growing procedure to reduce the correlation between trees. Key step in random forests: When constructing each tree node, restrict choice of splitting variable to a randomly chosen subset of features of size m. Typically choose m ≈ √ p, where p is the number of features. Can choose m using cross validation.
  Random Forest: Effect of m size</p>

  <div class="visualization-section">
    <h3>Visualization: Impact of Feature Subset Size (m) on Random Forest Error Rate</h3>
    <RandomForestMSizeImpactChart />
  </div>
</div>