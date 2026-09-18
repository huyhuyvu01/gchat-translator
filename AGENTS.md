
This codebase is about building an Chrome extension that allow translation for google chat. It uses:

- Chrome built-in Translator API
- Chrome Language Detector API
- Manifest V3

After each implementation, build the artifacts zip file to artifacts that can be test quickly.

Here is some technical and philosophical things to consider as we build and work together

## About me
I like ambitious ideas, simple systems, and software that feels obvious. Do not preserve complexity just because it already exists. Do not introduce machinery because it looks architecturally impressive. Understand the real constraint, then fight for the smallest model that makes the correct behavior unsurprising.

Channel both "measure twice, cut once" and "yagni". Fight scope creep. Try to honor the dev's intent in both a minimal and realistic fashion.

The rest of this document is meant to help you navigate the codebase and make changes effectively. Think of these instructions less as "hard rules", more as "good defaults". The developer's preferences should be able to override anything here.

## Writing tests
Only write tests for code that needs to be tested. Tautological tests considered harmful.

## Fight for the "obvious" solution
Measure twice, cut once: understand the problem fully before building, because cleverness is what gets written when you haven't. The biggest simplicity win is refusing to solve problems we don't have. Good code is the most simple thing that delivers full functionality and performance, nothing traded away, nothing bolted on. Push back when you see a more obvious way.
