const VERTEX_SHADER = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;

uniform mat4 uModelView;
uniform mat4 uProjection;

out vec3 vPosition;
out vec3 vNormal;

void main() {
  vec4 p = uModelView * vec4(aPosition, 1.0);
  vPosition = p.xyz;
  vNormal = mat3(uModelView) * aNormal;
  gl_Position = uProjection * p;
}
`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec3 vPosition;
in vec3 vNormal;

uniform vec3 uLightPos;   // eye space
uniform vec3 uLightPos2;
uniform vec3 uKa, uKd, uKs; // Ambient, diffuse, specular
uniform float uShininess;
uniform bool uFlat; // True is flat shading, false is smooth shading

out vec4 fragColor;

vec3 shade(vec3 lightPos, vec3 N, vec3 V) {
  vec3 L = normalize(lightPos - vPosition);
  vec3 R = reflect(-L, N);

  float diff = max(dot(N, L), 0.0);

  float spec = 0.0;

  if (diff > 0.0) {
    spec = pow(max(dot(V, R), 0.0), uShininess);
  }

  return uKd * diff + uKs * spec;
}

void main() {

  
  vec3 N;
  if(uFlat) {
    N = normalize(cross(dFdx(vPosition), dFdy(vPosition)));
  } else {
    N = normalize(vNormal);
  }

  vec3 V = normalize(-vPosition);

  fragColor = vec4(uKa + shade(uLightPos, N, V) + shade(uLightPos2, N, V), 1.0);
}
`;

// WebGL setup
const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl2");

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

// Fixed attribute slots, so the meshes stay valid when the shaders are recompiled
const ATTRIBUTES = { aPosition: 0, aNormal: 1 };

function createProgram(vsSource, fsSource) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
  for (const name in ATTRIBUTES) gl.bindAttribLocation(prog, ATTRIBUTES[name], name);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

// Shader editors
const vertEditor = document.getElementById("vertEditor");
const fragEditor = document.getElementById("fragEditor");
const shaderError = document.getElementById("shaderError");
vertEditor.value = VERTEX_SHADER;
fragEditor.value = FRAGMENT_SHADER;

// Removing uColor
let program, uModelView, uProjection, uLightPos, uLightpos2, uKa, uKd, uKs, uShininess, uFlat;

function updateProgram() {
  try {
    const prog = createProgram(vertEditor.value, fragEditor.value);
    gl.deleteProgram(program);
    program = prog;
    gl.useProgram(program);
    uModelView = gl.getUniformLocation(program, "uModelView");
    uProjection = gl.getUniformLocation(program, "uProjection");
    uLightPos = gl.getUniformLocation(program, "uLightPos");
    uLightPos2 = gl.getUniformLocation(program, "uLightPos2");
    uKa = gl.getUniformLocation(program, "uKa");
    uKd = gl.getUniformLocation(program, "uKd");
    uKs = gl.getUniformLocation(program, "uKs");

    uShininess = gl.getUniformLocation(program, "uShininess");

    uFlat = gl.getUniformLocation(program, "uFlat");
    shaderError.textContent = "";
  } catch (e) {
    shaderError.textContent = e.message.replace(/\0/g, "");  // some drivers end the log with \0
  }
}
updateProgram();
vertEditor.addEventListener("input", updateProgram);
fragEditor.addEventListener("input", updateProgram);

function bindAttribute(name, data) {
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.vertexAttribPointer(ATTRIBUTES[name], 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(ATTRIBUTES[name]);
}

function createMesh({ positions, normals, indices }) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  bindAttribute("aPosition", positions);
  bindAttribute("aNormal", normals);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  return { vao, count: indices.length };
}

const cubeMesh = createMesh(createCube());
const cylinderMesh = createMesh(createCylinder(32));
//Adding sphere and triangular prism
const sphereMesh = createMesh(createSphere());
const prismMesh = createMesh(createTriangularPrism());

gl.enable(gl.DEPTH_TEST);
gl.clearColor(0, 0, 0, 1);
const projection = perspective(Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
const lightWorld = [3, 4, 5];
// Second light
const lightWorld2 = [-4, 2, 3];

// Interactive controls
let dragRotX = 0, dragRotY = -0.5;      // mouse drag
let camX = 0, camY = 0, camZ = -7;      // arrow keys, w, s
let sliderAngle = 0;                    // degrees
let spinning = false, spinAngle = 0;    // Start/Stop button

let mouseDown = false, lastX, lastY;
canvas.addEventListener("mousedown", e => { mouseDown = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener("mouseup", () => mouseDown = false);
window.addEventListener("mousemove", e => {
  if (!mouseDown) return;
  dragRotY += (e.clientX - lastX) * 0.01;
  dragRotX += (e.clientY - lastY) * 0.01;
  lastX = e.clientX; lastY = e.clientY;
});

document.addEventListener("keydown", e => {
  if (e.target === vertEditor || e.target === fragEditor) return;  // let the editors use the keys
  const step = 0.2;
  switch (e.key) {
    case "ArrowUp": camY -= step; break;
    case "ArrowDown": camY += step; break;
    case "ArrowLeft": camX += step; break;
    case "ArrowRight": camX -= step; break;
    case "w": camZ += step; break;
    case "s": camZ -= step; break;
    default: return;
  }
  e.preventDefault();  // keep the arrow keys from scrolling the page
});

const axisSelect = document.getElementById("axisSelect");
document.getElementById("slider").addEventListener("input", e => {
  sliderAngle = Number(e.target.value);
  document.getElementById("sliderValue").textContent = sliderAngle;
});
document.getElementById("spinButton").addEventListener("click", () => spinning = !spinning);

// New materials
const MATTE_RED = { ka: [0.2, 0.04, 0.04], kd: [0.8, 0.16, 0.16], ks: [0, 0, 0], shininess: 1 };
const PLASTIC_BLUE = { ka: [0.04, 0.08, 0.2], kd: [0.16, 0.32, 0.8], ks: [0.5, 0.5, 0.5], shininess: 32 };
const GOLD = { ka: [0.25, 0.2, 0.07], kd: [0.35, 0.28, 0.1], ks: [0.8, 0.7, 0.4], shininess: 80 };
const GLOSSY_GREEN = { ka: [0.05, 0.2, 0.1],  kd: [0, 0, 0], ks: [0.9, 0.9, 0.9], shininess: 16 };

function createNode(mesh, material, shape, flat = false) {
  return { mesh, material, shape, flat, joint: null, children: []};
}

// Updated so each will have material and color
const lowerArm = createNode(cylinderMesh, MATTE_RED,
  multiply(translate(0, 0.6, 0), scale(0.3, 0.6, 0.3)), true);


// Upper arm: scale the cube then move it up by 0.5 so its bottom sits at the joint
const upperArm = createNode(cubeMesh, PLASTIC_BLUE,
  multiply(translate(0, 0.5, 0), scale(0.2, 0.5, 0.2)));


  // Adding sphere
const sphereNode = createNode(sphereMesh, GOLD,
  scale(0.25, 0.25, 0.25));


  // adding triangular prism
const prismNode = createNode(prismMesh, GLOSSY_GREEN,
  multiply(translate(0, 0.25, 0), scale(0.2, 0.25, 0.15)));


// Transformation hierarchy
lowerArm.children.push(upperArm);
upperArm.children.push(sphereNode); // Adding a "hinge"
sphereNode.children.push(prismNode); // Last piece 

const upperArmSlider = document.getElementById("upperArmSlider");
const prismSlider = document.getElementById("prismSlider");

document.getElementById("upperArmColor").addEventListener("input", e => {
  const hex = e.target.value;
  const color = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16) / 255);
  upperArm.material.kd = color; 
  upperArm.material.ka = color.map(c => c * 0.25);
});

document.getElementById("sphereShine").addEventListener("input", e => {
  sphereNode.material.shininess = Number(e.target.value);
});


function drawNode(node, frame) {
  const m = node.material;
  gl.uniformMatrix4fv(uModelView, false, multiply(frame, node.shape));

  gl.uniform3fv(uKa, m.ka);
  gl.uniform3fv(uKd, m.kd);
  gl.uniform3fv(uKs, m.ks);
  gl.uniform1f(uShininess, m.shininess);
  if(node.flat) {
    gl.uniform1i(uFlat, 1);
  } else {
    gl.uniform1i(uFlat, 0);
  }
  gl.bindVertexArray(node.mesh.vao);
  gl.drawElements(gl.TRIANGLES, node.mesh.count, gl.UNSIGNED_SHORT, 0);
}

//Data structure
function drawTree(root, rootFrame) {
  const stack = [[root, rootFrame]];
  while (stack.length > 0) {
    const [node, parentFrame] = stack.pop();
    const frame = multiply(parentFrame, node.joint);
    drawNode(node, frame);
    for (const child of node.children) stack.push([child, frame]);
  }
}

// Render loop
let lastTime = 0;
function render(time) {
  const t = time / 1000;
  if (spinning) spinAngle += t - lastTime;
  lastTime = t;
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Camera moves with the keys; the light stays fixed in the world.
  const view = translate(camX, camY, camZ);
  gl.uniformMatrix4fv(uProjection, false, projection);
  gl.uniform3fv(uLightPos, transformPoint(view, lightWorld));
  gl.uniform3fv(uLightPos2, transformPoint(view, lightWorld2));

  // Whole-model rotation
  const axisRotation = ROTATE[axisSelect.value](sliderAngle * Math.PI / 180 + spinAngle);
  const rotation = multiply(multiply(rotateY(dragRotY), rotateX(dragRotX)), axisRotation);

  // Lower arm (root)
  lowerArm.joint = multiply(multiply(translate(0, -2, 0), rotation), rotateZ(0.5 * Math.sin(t)));

  const deg = Math.PI / 180;

  // Upper arm (child)
  // Updated to twist based on the slider
  upperArm.joint = multiply(translate(0, 1.2, 0), rotateZ(Number(upperArmSlider.value) * deg));
  
  sphereNode.joint = translate(0, 1.0, 0);

  // Updated to twist based on the slider
  prismNode.joint = multiply(translate(0, 0.25, 0), rotateY(Number(prismSlider.value) * deg));

  drawTree(lowerArm, view);
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
