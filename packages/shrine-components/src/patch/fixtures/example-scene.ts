import type { SceneSnapshot } from "../contract.js";

export const exampleScene = {
  header: {
    protocol: 1,
    surface: "patch-demo",
    encounter: "encounter-demo:1",
    viewSeq: 1,
    sourceRev: "source:1",
    layoutRev: "layout:1",
    rendererEpoch: "goo-renderer:1",
  },
  extent: {
    x: 16,
    y: -8,
    width: 952,
    height: 360,
  },
  initialCamera: {
    kind: "fit",
    paddingPx: 32,
  },
  policy: {
    minScale: 0.125,
    maxScale: 4,
    dragThresholdPx: 4,
    touchDragThresholdPx: 8,
    snapTolerancePx: 6,
    portTolerancePx: 12,
    touchPortTolerancePx: 22,
    wireTolerancePx: 6,
    alignmentSnap: true,
    autoPanBandPx: 32,
    autoPanMaxPxPerSecond: 480,
  },
  offers: {
    moveNodes: "fixture-binding:moveNodes",
    connect: "fixture-binding:connect",
    reconnect: "fixture-binding:reconnect",
    disconnect: "fixture-binding:disconnect",
    createFromPort: "fixture-binding:createFromPort",
    compatibility: "fixture-binding:compatibility",
    context: "fixture-binding:context",
    createPicker: "fixture-binding:createPicker",
    reveal: "fixture-binding:reveal",
  },
  nodes: [
    {
      key: "source",
      lifetime: "node-life:source",
      selectorRef: "sel:source",
      rect: {
        x: 40,
        y: 80,
        width: 200,
        height: 128,
      },
      z: 10,
      presentation: "node",
      draggable: true,
      ports: [
        {
          key: "out",
          lifetime: "port-life:source:out",
          selectorRef: "sel:source:out",
          anchor: {
            x: 200,
            y: 64,
          },
          outward: {
            x: 1,
            y: 0,
          },
          hitRect: {
            x: 188,
            y: 52,
            width: 24,
            height: 24,
          },
          direction: "output",
          connectable: true,
        },
      ],
    },
    {
      key: "transform",
      lifetime: "node-life:transform",
      selectorRef: "sel:transform",
      rect: {
        x: 360,
        y: 56,
        width: 240,
        height: 200,
      },
      z: 10,
      presentation: "node",
      draggable: true,
      ports: [
        {
          key: "in",
          lifetime: "port-life:transform:in",
          selectorRef: "sel:transform:in",
          anchor: {
            x: 0,
            y: 72,
          },
          outward: {
            x: -1,
            y: 0,
          },
          hitRect: {
            x: -12,
            y: 60,
            width: 24,
            height: 24,
          },
          direction: "input",
          connectable: true,
        },
        {
          key: "state",
          lifetime: "port-life:transform:state",
          selectorRef: "sel:transform:state",
          anchor: {
            x: 0,
            y: 144,
          },
          outward: {
            x: -1,
            y: 0,
          },
          hitRect: {
            x: -12,
            y: 132,
            width: 24,
            height: 24,
          },
          direction: "input",
          connectable: true,
        },
        {
          key: "out",
          lifetime: "port-life:transform:out",
          selectorRef: "sel:transform:out",
          anchor: {
            x: 240,
            y: 96,
          },
          outward: {
            x: 1,
            y: 0,
          },
          hitRect: {
            x: 228,
            y: 84,
            width: 24,
            height: 24,
          },
          direction: "output",
          connectable: true,
        },
      ],
    },
    {
      key: "sink",
      lifetime: "node-life:sink",
      selectorRef: "sel:sink",
      rect: {
        x: 740,
        y: 112,
        width: 200,
        height: 160,
      },
      z: 10,
      presentation: "node",
      draggable: true,
      ports: [
        {
          key: "in",
          lifetime: "port-life:sink:in",
          selectorRef: "sel:sink:in",
          anchor: {
            x: 0,
            y: 48,
          },
          outward: {
            x: -1,
            y: 0,
          },
          hitRect: {
            x: -12,
            y: 36,
            width: 24,
            height: 24,
          },
          direction: "input",
          connectable: true,
        },
        {
          key: "preview",
          lifetime: "port-life:sink:preview",
          selectorRef: "sel:sink:preview",
          anchor: {
            x: 0,
            y: 112,
          },
          outward: {
            x: -1,
            y: 0,
          },
          hitRect: {
            x: -12,
            y: 100,
            width: 24,
            height: 24,
          },
          direction: "input",
          connectable: true,
        },
      ],
    },
  ],
  connections: [
    {
      key: "shared-result",
      lifetime: "connection-life:shared-result",
      selectorRef: "sel:shared-result",
      topologyRef: "topology:shared-result:1",
      z: 0,
      endpoints: [
        {
          key: "e-source",
          port: {
            kind: "port",
            node: "source",
            nodeLifetime: "node-life:source",
            port: "out",
            lifetime: "port-life:source:out",
          },
        },
        {
          key: "e-transform",
          port: {
            kind: "port",
            node: "transform",
            nodeLifetime: "node-life:transform",
            port: "in",
            lifetime: "port-life:transform:in",
          },
        },
        {
          key: "e-preview",
          port: {
            kind: "port",
            node: "sink",
            nodeLifetime: "node-life:sink",
            port: "preview",
            lifetime: "port-life:sink:preview",
          },
        },
      ],
      junctions: [
        {
          key: "j0",
          point: {
            x: 300,
            y: 320,
          },
          marker: "dot",
        },
      ],
      segments: [
        {
          key: "source-trunk",
          to: {
            kind: "junction",
            key: "j0",
          },
          commands: [
            {
              op: "M",
              to: {
                x: 240,
                y: 144,
              },
            },
            {
              op: "L",
              to: {
                x: 280,
                y: 144,
              },
            },
            {
              op: "L",
              to: {
                x: 280,
                y: 320,
              },
            },
            {
              op: "L",
              to: {
                x: 300,
                y: 320,
              },
            },
          ],
          endMarker: "none",
          from: {
            kind: "endpoint",
            key: "e-source",
          },
        },
        {
          key: "transform-branch",
          to: {
            kind: "endpoint",
            key: "e-transform",
          },
          commands: [
            {
              op: "M",
              to: {
                x: 300,
                y: 320,
              },
            },
            {
              op: "L",
              to: {
                x: 320,
                y: 320,
              },
            },
            {
              op: "L",
              to: {
                x: 320,
                y: 128,
              },
            },
            {
              op: "L",
              to: {
                x: 360,
                y: 128,
              },
            },
          ],
          endMarker: "arrow",
          from: {
            kind: "junction",
            key: "j0",
          },
        },
        {
          key: "preview-branch",
          to: {
            kind: "endpoint",
            key: "e-preview",
          },
          commands: [
            {
              op: "M",
              to: {
                x: 300,
                y: 320,
              },
            },
            {
              op: "L",
              to: {
                x: 680,
                y: 320,
              },
            },
            {
              op: "L",
              to: {
                x: 680,
                y: 224,
              },
            },
            {
              op: "L",
              to: {
                x: 740,
                y: 224,
              },
            },
          ],
          endMarker: "arrow",
          from: {
            kind: "junction",
            key: "j0",
          },
        },
      ],
      parts: [],
      labels: [
        {
          key: "caption",
          rect: {
            x: 440,
            y: 292,
            width: 144,
            height: 20,
          },
        },
      ],
      reconnectable: true,
      disconnectable: true,
    },
    {
      key: "transformed-result",
      lifetime: "connection-life:transformed-result",
      selectorRef: "sel:transformed-result",
      topologyRef: "topology:transformed-result:1",
      z: 1,
      endpoints: [
        {
          key: "e-from",
          port: {
            kind: "port",
            node: "transform",
            nodeLifetime: "node-life:transform",
            port: "out",
            lifetime: "port-life:transform:out",
          },
        },
        {
          key: "e-to",
          port: {
            kind: "port",
            node: "sink",
            nodeLifetime: "node-life:sink",
            port: "in",
            lifetime: "port-life:sink:in",
          },
        },
      ],
      junctions: [],
      segments: [
        {
          key: "s0",
          from: {
            kind: "endpoint",
            key: "e-from",
          },
          to: {
            kind: "endpoint",
            key: "e-to",
          },
          commands: [
            {
              op: "M",
              to: {
                x: 600,
                y: 152,
              },
            },
            {
              op: "C",
              c1: {
                x: 652,
                y: 152,
              },
              c2: {
                x: 688,
                y: 160,
              },
              to: {
                x: 740,
                y: 160,
              },
            },
          ],
          endMarker: "arrow",
        },
      ],
      parts: [],
      labels: [],
      reconnectable: true,
      disconnectable: true,
    },
    {
      key: "feedback",
      lifetime: "connection-life:feedback",
      selectorRef: "sel:feedback",
      topologyRef: "topology:feedback:1",
      z: 2,
      endpoints: [
        {
          key: "e-from",
          port: {
            kind: "port",
            node: "transform",
            nodeLifetime: "node-life:transform",
            port: "out",
            lifetime: "port-life:transform:out",
          },
        },
        {
          key: "e-to",
          port: {
            kind: "port",
            node: "transform",
            nodeLifetime: "node-life:transform",
            port: "state",
            lifetime: "port-life:transform:state",
          },
        },
      ],
      junctions: [],
      segments: [
        {
          key: "loop",
          to: {
            kind: "endpoint",
            key: "e-to",
          },
          commands: [
            {
              op: "M",
              to: {
                x: 600,
                y: 152,
              },
            },
            {
              op: "L",
              to: {
                x: 640,
                y: 152,
              },
            },
            {
              op: "L",
              to: {
                x: 640,
                y: 16,
              },
            },
            {
              op: "L",
              to: {
                x: 336,
                y: 16,
              },
            },
            {
              op: "L",
              to: {
                x: 336,
                y: 200,
              },
            },
            {
              op: "L",
              to: {
                x: 360,
                y: 200,
              },
            },
          ],
          endMarker: "arrow",
          from: {
            kind: "endpoint",
            key: "e-from",
          },
        },
      ],
      parts: [],
      labels: [],
      reconnectable: true,
      disconnectable: true,
    },
  ],
} as const satisfies SceneSnapshot;
