function createCube() {
  const positions = new Float32Array([
    -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,   // front
     1, -1, -1,  -1, -1, -1,  -1,  1, -1,   1,  1, -1,   // back
    -1,  1,  1,   1,  1,  1,   1,  1, -1,  -1,  1, -1,   // top
    -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,   // bottom
     1, -1,  1,   1, -1, -1,   1,  1, -1,   1,  1,  1,   // right
    -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1    // left
  ]);
  const faceNormals = [[0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0]];
  const normals = new Float32Array(faceNormals.flatMap(n => [...n, ...n, ...n, ...n]));

  const indices = new Uint16Array([
     0,  1,  2,   0,  2,  3,   // front
     4,  5,  6,   4,  6,  7,   // back
     8,  9, 10,   8, 10, 11,   // top
    12, 13, 14,  12, 14, 15,   // bottom
    16, 17, 18,  16, 18, 19,   // right
    20, 21, 22,  20, 22, 23    // left
  ]);
  return { positions, normals, indices };
}

function createCylinder(segments) {
  const pos = [], nrm = [], idx = [];

  // Side
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2, x = Math.cos(a), z = Math.sin(a);
    pos.push(x, -1, z, x, 1, z);
    nrm.push(x, 0, z, x, 0, z);
  }
  for (let i = 0; i < segments; i++) {
    const b = i * 2;
    idx.push(b, b + 1, b + 3, b, b + 3, b + 2);
  }

  // Caps
  for (const y of [-1, 1]) {
    const center = pos.length / 3;
    pos.push(0, y, 0);
    nrm.push(0, y, 0);
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      pos.push(Math.cos(a), y, Math.sin(a));
      nrm.push(0, y, 0);
    }
    for (let i = 1; i <= segments; i++) {
      if (y > 0) idx.push(center, center + i + 1, center + i);
      else idx.push(center, center + i, center + i + 1);
    }
  }

  return { positions: new Float32Array(pos), normals: new Float32Array(nrm), indices: new Uint16Array(idx) };
}

  function createTriangularPrism() {
  const positions = new Float32Array([[
    //Front
    -1, -1, 1,
    1, -1, 1,
    0, 1, 1,

    //Back
    1, -1, -1,
    -1, -1, -1, 
    0, 1, -1,

    //Bottom
    -1, -1, 1,
    -1, -1, -1,
    1, -1, -1,
    1, -1, 1,

    //Left
    -1, -1, 1,
    0, 1, 1,
    0, 1, -1,
    -1, -1, -1,

    //Right
    1, -1, 1,
    1, -1, -1,
    0, 1, -1,
    0, 1, 1
  ]]);

  // Normal vectors for the slanted faces got from getting the vectors that 
  // connects the sides, subtracting them then using dot product to find a normal
  const nx = 2 / Math.sqrt(5);
  const ny = 1 / Math.sqrt(5);

  const normals = new Float32Array([
    // Front
     0, 0, 1,  0, 0, 1,  0, 0, 1,

    // Back
     0, 0,-1,  0, 0,-1,  0, 0,-1,

    // Bottom
     0,-1, 0,  0,-1, 0,  0,-1, 0,  0,-1, 0,

    // Left
    -nx,ny,0, -nx,ny,0, -nx,ny,0, -nx,ny,0,

    // Right
     nx,ny,0,  nx,ny,0,  nx,ny,0,  nx,ny,0
  ]);

  const indices = new Uint16Array([
      // Front
      0,  1,  2,

      // Back
      3,  4,  5,

      // Bottom
      6,  7,  8,
      6,  8,  9,

      // Left
      10, 11, 12,
      10, 12, 13,

      // Right
      14, 15, 16,
      14, 16, 17
  ]);

   return { positions, normals, indices };
}

// Set stacks and slices to 24 and 32 by default
function createSphere(stacks = 24, slices = 32)