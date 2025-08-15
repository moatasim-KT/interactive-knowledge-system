import{p as d,f as i,Z as c,r as t,v as p,$ as u,i as m,w as g}from"../chunks/D9dWO0Sc.js";import{I as h}from"../chunks/B_es5EVb.js";var f=i('<meta name="description" content="Demo of the interactive article viewer component"/>'),v=i('<div class="demo-container svelte-1qm88km"><!></div>');function D(n,a){d(a,!0);const r={id:"sample-article-1",title:"Interactive Machine Learning Guide",content:[],metadata:{originalFileName:"ml-guide.pdf",fileSize:2048e3,mimeType:"application/pdf",processedAt:new Date,processingTime:5e3,extractedText:15e3,pageCount:25,language:"en",author:"Dr. Jane Smith",keywords:["machine learning","neural networks","deep learning","AI"]},structure:{sections:[{id:"introduction",title:"Introduction to Machine Learning",level:1,content:[{id:"intro-text-1",type:"text",content:`<p>Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed for every task.</p>
							<p>This comprehensive guide will take you through the fundamentals of machine learning, from basic concepts to advanced techniques used in modern AI systems.</p>`,metadata:{created:new Date,modified:new Date,version:1}},{id:"intro-quiz-1",type:"quiz",content:{title:"Introduction Quiz",questions:[{id:"q1",type:"multiple-choice",question:"What is machine learning?",options:["A type of computer hardware","A subset of artificial intelligence","A programming language","A database system"],correctAnswer:1,explanation:"Machine learning is indeed a subset of artificial intelligence that focuses on algorithms that can learn from data."},{id:"q2",type:"multiple-choice",question:"Which of the following is NOT a type of machine learning?",options:["Supervised learning","Unsupervised learning","Reinforcement learning","Quantum learning"],correctAnswer:3,explanation:"Quantum learning is not a recognized type of machine learning. The main types are supervised, unsupervised, and reinforcement learning."}]},metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]},{id:"supervised-learning",title:"Supervised Learning",level:1,content:[{id:"supervised-text-1",type:"text",content:`<p>Supervised learning is a type of machine learning where the algorithm learns from labeled training data to make predictions on new, unseen data.</p>
							<p>In supervised learning, we have input-output pairs, and the goal is to learn a mapping function from inputs to outputs.</p>`,metadata:{created:new Date,modified:new Date,version:1}},{id:"supervised-code-1",type:"code",content:{language:"python",code:`# Example of supervised learning with scikit-learn
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error
import numpy as np

# Generate sample data
X = np.random.randn(100, 1)
y = 2 * X.flatten() + 1 + np.random.randn(100) * 0.1

# Split the data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

# Train the model
model = LinearRegression()
model.fit(X_train, y_train)

# Make predictions
y_pred = model.predict(X_test)

# Evaluate
mse = mean_squared_error(y_test, y_pred)
print(f"Mean Squared Error: {mse:.4f}")`},metadata:{created:new Date,modified:new Date,version:1}}],subsections:[{id:"classification",title:"Classification",level:2,content:[{id:"classification-text-1",type:"text",content:`<p>Classification is a supervised learning task where the goal is to predict discrete class labels.</p>
									<p>Common classification algorithms include:</p>
									<ul>
										<li>Logistic Regression</li>
										<li>Decision Trees</li>
										<li>Random Forest</li>
										<li>Support Vector Machines</li>
										<li>Neural Networks</li>
									</ul>`,metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]},{id:"regression",title:"Regression",level:2,content:[{id:"regression-text-1",type:"text",content:`<p>Regression is a supervised learning task where the goal is to predict continuous numerical values.</p>
									<p>Linear regression is one of the simplest and most widely used regression techniques.</p>`,metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]}]},{id:"unsupervised-learning",title:"Unsupervised Learning",level:1,content:[{id:"unsupervised-text-1",type:"text",content:`<p>Unsupervised learning deals with finding patterns in data without labeled examples.</p>
							<p>The main types of unsupervised learning include clustering, dimensionality reduction, and association rule learning.</p>`,metadata:{created:new Date,modified:new Date,version:1}},{id:"unsupervised-image-1",type:"image",content:{url:"https://via.placeholder.com/600x300/4f46e5/ffffff?text=Clustering+Visualization",alt:"Visualization of clustering algorithm results showing different colored groups of data points"},metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]},{id:"neural-networks",title:"Neural Networks and Deep Learning",level:1,content:[{id:"neural-text-1",type:"text",content:`<p>Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information.</p>
							<p>Deep learning uses neural networks with multiple hidden layers to learn complex patterns in data.</p>`,metadata:{created:new Date,modified:new Date,version:1}},{id:"neural-quiz-1",type:"quiz",content:{title:"Neural Networks Quiz",questions:[{id:"nn-q1",type:"multiple-choice",question:"What is a neuron in a neural network?",options:["A biological cell","A processing unit that receives inputs and produces an output","A type of computer memory","A programming function"],correctAnswer:1,explanation:"In neural networks, a neuron is a processing unit that receives inputs, applies weights and a bias, and produces an output through an activation function."}]},metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]},{id:"conclusion",title:"Conclusion and Next Steps",level:1,content:[{id:"conclusion-text-1",type:"text",content:`<p>This guide has covered the fundamental concepts of machine learning, from supervised and unsupervised learning to neural networks and deep learning.</p>
							<p>To continue your machine learning journey, consider:</p>
							<ul>
								<li>Practicing with real datasets</li>
								<li>Learning advanced algorithms</li>
								<li>Exploring specialized domains like computer vision and NLP</li>
								<li>Building end-to-end machine learning projects</li>
							</ul>
							<p>Remember, machine learning is a rapidly evolving field, so continuous learning and practice are essential for success.</p>`,metadata:{created:new Date,modified:new Date,version:1}}],subsections:[]}],toc:{entries:[{id:"introduction",title:"Introduction to Machine Learning",level:1,children:[]},{id:"supervised-learning",title:"Supervised Learning",level:1,children:[{id:"classification",title:"Classification",level:2,children:[]},{id:"regression",title:"Regression",level:2,children:[]}]},{id:"unsupervised-learning",title:"Unsupervised Learning",level:1,children:[]},{id:"neural-networks",title:"Neural Networks and Deep Learning",level:1,children:[]},{id:"conclusion",title:"Conclusion and Next Steps",level:1,children:[]}]},metadata:{totalSections:5,maxDepth:2,hasImages:!0,hasCode:!0,hasTables:!1}},assets:[{id:"clustering-viz",type:"image",url:"https://via.placeholder.com/600x300/4f46e5/ffffff?text=Clustering+Visualization",filename:"clustering-visualization.png",size:45e3,mimeType:"image/png"}],source:{type:"file",uploadedAt:new Date,userId:"demo-user"}};var e=v();c(o=>{var l=f();u.title="Interactive Article Viewer Demo",t(o,l)});var s=m(e);h(s,{get document(){return r},showToc:!0,enableBookmarks:!0,enableAnnotations:!0,enableProgressTracking:!0,class:"demo-viewer"}),g(e),t(n,e),p()}export{D as component};
