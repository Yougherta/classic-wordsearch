# Contributing

Thanks for helping. Bug reports, feature ideas and pull requests are welcome.

- Use Node 22 or newer and run `npm test` before opening a pull request.
- Add a regression test for any behavior change, including negative or tampered inputs.
- Keep the verifier independent: `lib/verify.js` and `lib/scan.js` must not import
  the generator or its placement code.
- Avoid new runtime dependencies. If one is truly needed, explain why and note its license.
- Use synthetic words in tests and examples.

By contributing you agree that your contribution is licensed under the MIT License.
