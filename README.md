A simple and easy to use indexed db wrapper written in js

```js
let crazy = new miDB("MY DATABASE")

// use a seperate object store in the database
crazy.useStorage("customers")

let name = "mist"
crazy[name] = "hey its misty user data"
console.log(await crazy[name])
```
