import {
  BufferAttribute,
  BufferGeometry,
  type Vector3Tuple,
} from "three";

type FaceDefinition = {
  name: string;
  vertices: Vector3Tuple[];
  normal: Vector3Tuple;
};

export function buildArtworkGeometry(width: number, height: number, depth: number) {
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  const faces: FaceDefinition[] = [
    {
      name: "front",
      vertices: [
        [-halfW, -halfH, halfD],
        [halfW, -halfH, halfD],
        [halfW, halfH, halfD],
        [-halfW, halfH, halfD],
      ],
      normal: [0, 0, 1],
    },
    {
      name: "back",
      vertices: [
        [halfW, -halfH, -halfD],
        [-halfW, -halfH, -halfD],
        [-halfW, halfH, -halfD],
        [halfW, halfH, -halfD],
      ],
      normal: [0, 0, -1],
    },
    {
      name: "right",
      vertices: [
        [halfW, -halfH, halfD],
        [halfW, -halfH, -halfD],
        [halfW, halfH, -halfD],
        [halfW, halfH, halfD],
      ],
      normal: [1, 0, 0],
    },
    {
      name: "left",
      vertices: [
        [-halfW, -halfH, -halfD],
        [-halfW, -halfH, halfD],
        [-halfW, halfH, halfD],
        [-halfW, halfH, -halfD],
      ],
      normal: [-1, 0, 0],
    },
    {
      name: "top",
      vertices: [
        [-halfW, halfH, halfD],
        [halfW, halfH, halfD],
        [halfW, halfH, -halfD],
        [-halfW, halfH, -halfD],
      ],
      normal: [0, 1, 0],
    },
    {
      name: "bottom",
      vertices: [
        [-halfW, -halfH, -halfD],
        [halfW, -halfH, -halfD],
        [halfW, -halfH, halfD],
        [-halfW, -halfH, halfD],
      ],
      normal: [0, -1, 0],
    },
  ];

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  faces.forEach((face, faceIndex) => {
    face.vertices.forEach((vertex) => positions.push(...vertex));
    face.vertices.forEach(() => normals.push(...face.normal));
    // UVs are assigned later because the atlas rectangles are not geometry concerns.
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    const offset = faceIndex * 4;
    indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
  });

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
