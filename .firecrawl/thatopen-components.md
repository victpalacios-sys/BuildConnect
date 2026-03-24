[Skip to main content](https://docs.thatopen.com/Tutorials/Components#__docusaurus_skipToContent_fallback)

[![That Open Logo](https://docs.thatopen.com/img/logo-green.svg)](https://docs.thatopen.com/)

[🤝 Want our help?](https://thatopen.com/accelerator) [Project](https://thatopen.com/) [Community](https://people.thatopen.com/) [NPM](https://www.npmjs.com/org/thatopen) [GitHub](https://github.com/ThatOpen/)

Search`` `K`

- [👨🏻‍💻 Introduction](https://docs.thatopen.com/intro)
- [🤝 Get involved](https://docs.thatopen.com/contributing)
- [🔄️ Migrating previous versions](https://docs.thatopen.com/migration)
- [🧩 Components](https://docs.thatopen.com/Tutorials/Components)

- [🔥 Fragments](https://docs.thatopen.com/Tutorials/Components)

- [👩🏻‍🏫 Tutorials](https://docs.thatopen.com/Tutorials/Components)

  - [Components](https://docs.thatopen.com/Tutorials/Components/)

    - [Core](https://docs.thatopen.com/Tutorials/Components)

    - [Front](https://docs.thatopen.com/Tutorials/Components)
  - [Fragments](https://docs.thatopen.com/Tutorials/Fragments/)

  - [UserInterface](https://docs.thatopen.com/Tutorials/UserInterface/)
- [📋 API](https://docs.thatopen.com/api/)


- [Home page](https://docs.thatopen.com/)
- 👩🏻‍🏫 Tutorials
- Components

On this page

# Components

[TOC](https://thatopen.com/)
\|
[documentation](https://docs.thatopen.com/intro)
\|
[demo](https://thatopen.github.io/engine_components/examples/IfcLoader/index.html)
\|
[community](https://people.thatopen.com/)
\|
[npm package](https://www.npmjs.com/org/thatopen)

![cover](https://thatopen.github.io/engine_components/resources/cover.png)

# Open BIM Components ![](https://thatopen.github.io/engine_components/resources/favicon.ico)

[![Components NPM Package](https://img.shields.io/npm/v/@thatopen/components)](https://www.npmjs.com/package/@thatopen/components)[![Components NPM Package](https://img.shields.io/npm/dw/@thatopen/components)](https://www.npmjs.com/package/@thatopen/components)[![Components Front NPM Package](https://img.shields.io/npm/v/@thatopen/components-front)](https://www.npmjs.com/package/@thatopen/components-front)[![Components Front NPM Package](https://img.shields.io/npm/dw/@thatopen/components-front)](https://www.npmjs.com/package/@thatopen/components-front)

This library is a collection of BIM tools based on [Three.js](https://github.com/mrdoob/three.js/) and other libraries. It includes pre-made features to easily build browser-based 3D BIM applications, such as postproduction, dimensions, floorplan navigation, DXF export and much more.

## 🤝 Want our help? [​](https://docs.thatopen.com/Tutorials/Components\#-want-our-help "Direct link to 🤝 Want our help?")

Are you developing a project with our technology and would like our help?
Apply now to join [That Open Accelerator Program](https://thatopen.com/accelerator)!

## Packages [​](https://docs.thatopen.com/Tutorials/Components\#packages "Direct link to Packages")

This library contains 2 packages:

`@thatopen/components` \- The core functionality. Compatible both with browser and Node.js environments.

`@thatopen/components-front` \- Features exclusive for browser environments.

## Usage [​](https://docs.thatopen.com/Tutorials/Components\#usage "Direct link to Usage")

You need to be familiar with [Three.js API](https://github.com/mrdoob/three.js/) to be able to use this library effectively. In the following example, we will create a cube in a 3D scene that can be navigated with the mouse or touch events. You can see the full example [here](https://github.com/ThatOpen/engine_components/blob/main/packages/core/src/core/Worlds/example.ts) and the deployed app [here](https://thatopen.github.io/engine_components/examples/Worlds/index.html).

```js
/* eslint import/no-extraneous-dependencies: 0 */

import * as THREE from "three";
import * as OBC from "../..";

const container = document.getElementById("container")!;

const components = new OBC.Components();

const worlds = components.get(OBC.Worlds);

const world = worlds.create<
  OBC.SimpleScene,
  OBC.SimpleCamera,
  OBC.SimpleRenderer
>();

world.scene = new OBC.SimpleScene(components);
world.renderer = new OBC.SimpleRenderer(components, container);
world.camera = new OBC.SimpleCamera(components);

components.init();

const material = new THREE.MeshLambertMaterial({ color: "#6528D7" });
const geometry = new THREE.BoxGeometry();
const cube = new THREE.Mesh(geometry, material);
world.scene.three.add(cube);

world.scene.setup();

world.camera.controls.setLookAt(3, 3, 3, 0, 0, 0);
```

[Previous\\
\\
🦾 Building your own exporter/importer](https://docs.thatopen.com/fragments/custom-building) [Next\\
\\
BCFTopics](https://docs.thatopen.com/Tutorials/Components/Core/BCFTopics)

- [🤝 Want our help?](https://docs.thatopen.com/Tutorials/Components#-want-our-help)
- [Packages](https://docs.thatopen.com/Tutorials/Components#packages)
- [Usage](https://docs.thatopen.com/Tutorials/Components#usage)

Copyright © 2026 That Open Company. Built with Docusaurus.