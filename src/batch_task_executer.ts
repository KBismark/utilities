
type FetchFunction<T> = (() => Promise<T>)|(()=>T);

/** Batch and performs same/repeated asynchronous tasks */
export class BatchedTaskExecutor {

  private pendingRequests: Map<string, {
    promise: Promise<any>;
  }> = new Map();

  constructor() {}

  protected perfromTask<T>(
    /** 
     * A key to identify the task type. If same key is passed to this method 
     * while previous task is being executed, the new task to be performed is queued 
     * to use the result of the previous task which is being executed.
     * 
    */
    key: string,
    /**
     * The task to execute. 
     */
    taskFn: FetchFunction<T>,
    options: {
        timeout?: number;
        retries?: number;
    } = {}
  ): Promise<T> {

    // Check if request is already in progress
    if (this.pendingRequests.has(key)) {
        const request = this.pendingRequests.get(key)!;
        return request.promise as Promise<T>;
    }
    
    // Create the promise that executes the fetch
    const promise = new Promise<T>((resolve, reject) => {

        // Handle timeout
        const timeoutId = options.timeout 
        ? setTimeout(() => {
            if (this.pendingRequests.has(key)) {
                this.pendingRequests.delete(key);
                reject(new Error(`Request timeout after ${options.timeout}ms`));
            }
            }, options.timeout)
        : null;
        
        // Execute the fetch inside the promise constructor
        const executeRequest = async () => {
            try {
                // Retry logic
                let retriesLeft = options.retries || 0;
                let result: any;
                let succeeded = false;
                
                do {
                    try {
                        result = await taskFn();
                        succeeded = true;
                        break;
                    } catch (err) {
                        if (retriesLeft <= 0) throw err;
                        retriesLeft--;
                        await new Promise(r => setTimeout(r, 1000 * (options.retries! - retriesLeft)));
                    }
                } while (retriesLeft >= 0);
                
                if (!succeeded) {
                    throw new Error("Failed to fetch after retries");
                }
        
                // Clean up and resolve
                this.pendingRequests.delete(key);
                if (timeoutId) clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                // Clean up and reject
                this.pendingRequests.delete(key);
                if (timeoutId) clearTimeout(timeoutId);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        };
        
        // Start the execution
        executeRequest();
    });

    this.pendingRequests.set(key, {promise});
    
    return promise;
  }

}
