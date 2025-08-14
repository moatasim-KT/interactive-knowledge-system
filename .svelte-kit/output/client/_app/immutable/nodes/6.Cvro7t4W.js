import{d as Z,p as z,s as G,b as Q,f,ar as X,h as e,i as s,k as ee,t as F,n as b,o as te,as as se,g as n,q as d,e as c,r as t,w as ae}from"../chunks/d1NyGob4.js";import{C as ie}from"../chunks/BWJA31ZZ.js";var le=f('<meta name="description" content="Demo of the interactive code editor with syntax highlighting and execution capabilities"/>'),ne=(r,a)=>{c(a,{...n(a),code:`print("Hello from Python!")
for i in range(5):
    print(f"Count: {i}")`,language:"python",title:"Python Example"},!0)},oe=(r,a)=>{c(a,{...n(a),code:`<!DOCTYPE html>
<html>
<head>
    <title>Hello World</title>
</head>
<body>
    <h1>Hello, HTML!</h1>
    <p>This is a simple HTML example.</p>
</body>
</html>`,language:"html",title:"HTML Example"},!0)},re=(r,a)=>{c(a,{...n(a),code:`const users = [
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 },
  { name: "Charlie", age: 35 }
];

const adults = users.filter(user => user.age >= 18);
console.log("Adult users:", adults);`,language:"javascript",title:"JavaScript Example"},!0)},de=(r,a)=>{c(a,{...n(a),code:`{
  "name": "Interactive Knowledge System",
  "version": "1.0.0",
  "features": [
    "Code Editor",
    "Syntax Highlighting",
    "Live Execution",
    "Version Control"
  ],
  "supported_languages": ["JavaScript", "Python", "HTML", "CSS"]
}`,language:"json",title:"JSON Example"},!0)},ce=f('<div class="flex justify-between"><span class="text-gray-600">Last Executed:</span> <span class="font-medium text-gray-800"> </span></div>'),ve=f(`<div class="container mx-auto px-4 py-8"><div class="max-w-6xl mx-auto"><header class="mb-8"><h1 class="text-4xl font-bold text-gray-900 mb-4">Interactive Code Editor Demo</h1> <p class="text-lg text-gray-600 mb-6">Experience our advanced code editor with syntax highlighting, live execution, and version
				control.</p></header> <div class="grid grid-cols-1 lg:grid-cols-2 gap-8"><div class="space-y-6"><div class="bg-white rounded-lg shadow-lg p-6"><h2 class="text-2xl font-semibold text-gray-800 mb-4">🚀 Live Code Editor</h2> <p class="text-gray-600 mb-4">Edit the code below and click execute to see it run in real-time.</p> <!></div> <div class="bg-white rounded-lg shadow-lg p-6"><h3 class="text-xl font-semibold text-gray-800 mb-4">📚 Try Different Languages</h3> <div class="grid grid-cols-2 gap-4"><button class="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-blue-800 font-medium transition-colors">🐍 Python</button> <button class="p-3 bg-orange-100 hover:bg-orange-200 rounded-lg text-orange-800 font-medium transition-colors">🌐 HTML</button> <button class="p-3 bg-yellow-100 hover:bg-yellow-200 rounded-lg text-yellow-800 font-medium transition-colors">⚡ JavaScript</button> <button class="p-3 bg-green-100 hover:bg-green-200 rounded-lg text-green-800 font-medium transition-colors">📄 JSON</button></div></div></div> <div class="space-y-6"><div class="bg-white rounded-lg shadow-lg p-6"><h2 class="text-2xl font-semibold text-gray-800 mb-4">✨ Key Features</h2> <div class="space-y-4"><div class="flex items-start space-x-3"><div class="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center"><span class="text-blue-600 text-sm">🎨</span></div> <div><h4 class="font-semibold text-gray-800">Syntax Highlighting</h4> <p class="text-gray-600 text-sm">Beautiful syntax highlighting for multiple programming languages using CodeMirror.</p></div></div> <div class="flex items-start space-x-3"><div class="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center"><span class="text-green-600 text-sm">▶️</span></div> <div><h4 class="font-semibold text-gray-800">Live Execution</h4> <p class="text-gray-600 text-sm">Execute JavaScript and Python code directly in the browser with real-time output.</p></div></div> <div class="flex items-start space-x-3"><div class="flex-shrink-0 w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center"><span class="text-purple-600 text-sm">📚</span></div> <div><h4 class="font-semibold text-gray-800">Version Control</h4> <p class="text-gray-600 text-sm">Track changes with built-in version history and restore previous versions.</p></div></div> <div class="flex items-start space-x-3"><div class="flex-shrink-0 w-6 h-6 bg-red-100 rounded-full flex items-center justify-center"><span class="text-red-600 text-sm">🔧</span></div> <div><h4 class="font-semibold text-gray-800">Error Highlighting</h4> <p class="text-gray-600 text-sm">Real-time error detection and highlighting for supported languages.</p></div></div> <div class="flex items-start space-x-3"><div class="flex-shrink-0 w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center"><span class="text-yellow-600 text-sm">🚀</span></div> <div><h4 class="font-semibold text-gray-800">Code Sharing</h4> <p class="text-gray-600 text-sm">Share code snippets with others and collaborate on projects.</p></div></div></div></div> <div class="bg-white rounded-lg shadow-lg p-6"><h3 class="text-xl font-semibold text-gray-800 mb-4">📊 Current Code Info</h3> <div class="space-y-2 text-sm"><div class="flex justify-between"><span class="text-gray-600">Language:</span> <span class="font-medium text-gray-800"> </span></div> <div class="flex justify-between"><span class="text-gray-600">Version:</span> <span class="font-medium text-gray-800"> </span></div> <div class="flex justify-between"><span class="text-gray-600">Lines:</span> <span class="font-medium text-gray-800"> </span></div> <div class="flex justify-between"><span class="text-gray-600">Characters:</span> <span class="font-medium text-gray-800"> </span></div> <!></div></div> <div class="bg-blue-50 rounded-lg p-6"><h3 class="text-lg font-semibold text-blue-800 mb-3">💡 Pro Tips</h3> <ul class="space-y-2 text-sm text-blue-700"><li>• Use <kbd class="px-2 py-1 bg-blue-200 rounded text-xs svelte-1blvpo8">Ctrl+S</kbd> to save your code</li> <li>• Use <kbd class="px-2 py-1 bg-blue-200 rounded text-xs svelte-1blvpo8">Ctrl+Z</kbd> to undo changes</li> <li>• Click the version history button to see all changes</li> <li>• Try the format button to clean up your code</li> <li>• JavaScript code runs in a secure sandbox environment</li></ul></div></div></div></div></div>`);function pe(r,a){z(a,!0);let l=G(Q({code:`// Welcome to the Interactive Code Editor!
console.log("Hello, World!");

// Try editing this code and click execute
function fibonacci(n) {
	if (n <= 1) return n;
	return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci sequence:");
for (let i = 0; i < 10; i++) {
	console.log(\`F(\${i}) = \${fibonacci(i)}\`);
}`,language:"javascript",title:"Fibonacci Example",description:"A simple recursive Fibonacci implementation",executable:!0,version:1,history:[]}));function I(i){c(l,i.detail,!0)}function V(i){const o=i.detail;console.log("Code executed:",o)}function $(i){const o=i.detail;console.log("Version created:",o)}var v=ve();X(i=>{var o=le();se.title="Code Editor Demo - Interactive Knowledge System",b(i,o)});var y=e(v),_=s(e(y),2),g=e(_),u=e(g),A=s(e(u),4);ie(A,{get content(){return n(l)},oncontentchange:I,onexecute:V,onversioncreated:$}),t(u);var w=s(u,2),k=s(e(w),2),C=e(k);C.__click=[ne,l];var E=s(C,2);E.__click=[oe,l];var S=s(E,2);S.__click=[re,l];var K=s(S,2);K.__click=[de,l],t(k),t(w),t(g);var j=s(g,2),L=s(e(j),2),T=s(e(L),2),p=e(T),H=s(e(p),2),O=e(H,!0);t(H),t(p);var x=s(p,2),J=s(e(x),2),W=e(J);t(J),t(x);var h=s(x,2),P=s(e(h),2),q=e(P,!0);t(P),t(h);var m=s(h,2),M=s(e(m),2),B=e(M,!0);t(M),t(m);var N=s(m,2);{var U=i=>{var o=ce(),D=s(e(o),2),R=e(D,!0);t(D),t(o),F(Y=>d(R,Y),[()=>n(l).lastExecuted.toLocaleTimeString()]),b(i,o)};ee(N,i=>{n(l).lastExecuted&&i(U)})}t(T),t(L),ae(2),t(j),t(_),t(y),t(v),F(i=>{d(O,n(l).language),d(W,`v${n(l).version??""}`),d(q,i),d(B,n(l).code.length)},[()=>n(l).code.split(`
`).length]),b(r,v),te()}Z(["click"]);export{pe as component};
