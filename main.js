class miDB {
  constructor(name) {
    this.name = name
    this.db = null
    this.initialised = false
    this.storage = "default"

    this.dbReady = new Promise((resolve, reject) => {
      // open the db
      const request = indexedDB.open(name)

      // make an error (if it errors on opening)!!!
      request.onerror = (event) => {
        console.error("Error opening database", event.target.error)
        reject(event.target.error)
      }

      // initialise the db if its successfully opened
      request.onsuccess = (event) => {
        this.db = event.target.result
        this.initialised = true
        resolve()
      }

      request.onupgradeneeded = (event) => {
        this.db = event.target.result
        // create the default storage if it doesn't exist
        if (!this.db.objectStoreNames.contains(this.storage)) {
          this.db.createObjectStore(this.storage, {
            keyPath: "key"
          })
        }
        // create the data store for backward compatibility
        if (!this.db.objectStoreNames.contains("data")) {
          this.db.createObjectStore("data", {
            keyPath: "key"
          })
        }
      }
    })

    // make a new proxy to modify the db using simple key syntax
    return new Proxy(this, {
      set: (target, key, value) => {
        if (key in target) {
          target[key] = value;
          return true;
        }

        // handle async set to IndexedDB
        this.dbReady.then(() => {
          const transaction = this.db.transaction([this.storage], "readwrite");
          const store = transaction.objectStore(this.storage);
          store.put({ key, value });
        }).catch(err => console.error("Database error:", err));

        return true;
      },
      get: (target, key) => {
        if (key in target) return target[key];
        
        // Return a promise that resolves with the value from IndexedDB
        return new Promise((resolve, reject) => {
          this.dbReady.then(() => {
            const transaction = this.db.transaction([this.storage], "readonly");
            const store = transaction.objectStore(this.storage);
            const request = store.get(key);
            
            request.onsuccess = () => {
              if (request.result) {
                resolve(request.result.value);
              } else {
                resolve(undefined);
              }
            };
            
            request.onerror = (event) => {
              reject(event.target.error);
            };
          }).catch(err => {
            console.error("Database error:", err);
            reject(err);
          });
        });
      }
    });
  }

  useStorage(storage) {
    this.storage = storage
    
    // replace the existing promise with a new one that manages the storage change
    this.dbReady = this.dbReady.then(() => {
      return new Promise((resolve, reject) => {
        if (!this.db.objectStoreNames.contains(storage)) {
          const version = this.db.version + 1
          this.db.close()
          const request = indexedDB.open(this.name, version)
          
          request.onupgradeneeded = (event) => {
            const db = event.target.result
            db.createObjectStore(storage, {
              keyPath: "key"
            })
          }
          
          request.onsuccess = (event) => {
            this.db = event.target.result
            resolve()
          }
          
          request.onerror = (event) => {
            console.error("Error upgrading database", event.target.error)
            reject(event.target.error)
          }
        } else {
          resolve()
        }
      })
    })
    
    return this.dbReady
  }
}

let crazy = new miDB("MY DATABASE")

// use a seperate object store in the database
crazy.useStorage("customers")

let name = "mist"
crazy[name] = "hey its misty user data"
console.log(await crazy[name])
