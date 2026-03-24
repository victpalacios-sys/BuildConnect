[Skip to main content](https://docs.thatopen.com/Tutorials/Fragments/#__docusaurus_skipToContent_fallback)

[![That Open Logo](https://docs.thatopen.com/img/logo-green.svg)](https://docs.thatopen.com/)

[🤝 Want our help?](https://thatopen.com/accelerator) [Project](https://thatopen.com/) [Community](https://people.thatopen.com/) [NPM](https://www.npmjs.com/org/thatopen) [GitHub](https://github.com/ThatOpen/)

Search`` `K`

- [👨🏻‍💻 Introduction](https://docs.thatopen.com/intro)
- [🤝 Get involved](https://docs.thatopen.com/contributing)
- [🔄️ Migrating previous versions](https://docs.thatopen.com/migration)
- [🧩 Components](https://docs.thatopen.com/Tutorials/Fragments/)

- [🔥 Fragments](https://docs.thatopen.com/Tutorials/Fragments/)

- [👩🏻‍🏫 Tutorials](https://docs.thatopen.com/Tutorials/Fragments/)

  - [Components](https://docs.thatopen.com/Tutorials/Components/)

  - [Fragments](https://docs.thatopen.com/Tutorials/Fragments/)

    - [Fragments](https://docs.thatopen.com/Tutorials/Fragments/)
  - [UserInterface](https://docs.thatopen.com/Tutorials/UserInterface/)
- [📋 API](https://docs.thatopen.com/api/)


- [Home page](https://docs.thatopen.com/)
- 👩🏻‍🏫 Tutorials
- Fragments

On this page

# Fragments

[TOC](https://thatopen.com/)
\|
[documentation](https://docs.thatopen.com/intro)
\|
[demo](https://thatopen.github.io/engine_fragment/examples/FragmentsModels/)
\|
[community](https://people.thatopen.com/)
\|
[npm package](https://www.npmjs.com/package/openbim-components)

![cover](https://thatopen.github.io/engine_components/resources/cover.png)

# Fragments ![](https://thatopen.github.io/engine_components/resources/favicon.ico)

[![NPM Package](https://img.shields.io/npm/v/@thatopen/fragments)](https://www.npmjs.com/package/@thatopen/fragments)[![NPM Package](https://img.shields.io/npm/dw/@thatopen/fragments)](https://www.npmjs.com/package/@thatopen/fragments)

Fragments is an open-source library designed to store, display, navigate, and edit massive amounts of BIM data with exceptional efficiency—on any device.

This repository contains the format and a whole toolkit to start building on top.

## 🤝 Want our help? [​](https://docs.thatopen.com/Tutorials/Fragments/\#-want-our-help "Direct link to 🤝 Want our help?")

Are you developing a project with our technology and would like our help?
Apply now to join [That Open Accelerator Program](https://thatopen.com/accelerator)!

## 🧩 The Format [​](https://docs.thatopen.com/Tutorials/Fragments/\#-the-format "Direct link to 🧩 The Format")

Fragments defines an open BIM format optimized for handling large datasets efficiently.

- Binary and compact for performance

- Free and open source

- Supports geometries, properties, and relationships


The format is built with [Google's FlatBuffers](https://flatbuffers.dev/), an efficient cross-platform serialization library. This means you can create your own Fragments importer/exporter in any programming language. Just refer to the FlatBuffers documentation to get started.

📄 You can find the Fragments schema [here](https://github.com/ThatOpen/engine_fragment/blob/main/packages/fragments/flatbuffers/index.fbs). It defines what kind of data Fragments can store—anything the schema supports, you can include.

This library also includes a TypeScript/JavaScript importer/exporter, so you can get up and running fast. But feel free to build your own!

That said, the easiest way to generate Fragments is by using the built-in IfcImporter, described below.

## 🚀 The 3D Engine [​](https://docs.thatopen.com/Tutorials/Fragments/\#-the-3d-engine "Direct link to 🚀 The 3D Engine")

Fragments comes with a high-performance 3D viewer built on top of Three.js. It’s designed to handle millions of elements in seconds, making it ideal for web-based BIM applications.

With it, you can:

- Display large BIM models efficiently on any device

- Highlight, filter, raycast, and snap elements

- Retrieve properties and interact with the model


## 🔄 Importers and exporters [​](https://docs.thatopen.com/Tutorials/Fragments/\#-importers-and-exporters "Direct link to 🔄 Importers and exporters")

This library includes an IfcImporter that works both in the frontend and backend. It makes it simple to bring your IFC data into the Fragments ecosystem.

We're planning to release more importers/exporters to help integrate Fragments into a wide variety of BIM workflows.

* * *

Whether you're building a lightweight BIM viewer, a full-scale application, or just exploring the future of open BIM formats, Fragments gives you the tools to do it—fast, open, and free.

> For more information and tutorials, check out our [documentation](https://docs.thatopen.com/intro).

[Previous\\
\\
VolumeMeasurement](https://docs.thatopen.com/Tutorials/Components/Front/VolumeMeasurement) [Next\\
\\
FragmentsModels](https://docs.thatopen.com/Tutorials/Fragments/Fragments/FragmentsModels/)

- [🤝 Want our help?](https://docs.thatopen.com/Tutorials/Fragments/#-want-our-help)
- [🧩 The Format](https://docs.thatopen.com/Tutorials/Fragments/#-the-format)
- [🚀 The 3D Engine](https://docs.thatopen.com/Tutorials/Fragments/#-the-3d-engine)
- [🔄 Importers and exporters](https://docs.thatopen.com/Tutorials/Fragments/#-importers-and-exporters)

Copyright © 2026 That Open Company. Built with Docusaurus.