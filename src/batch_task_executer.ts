
type TaskFunction<T> = (() => Promise<T>)|(()=>T);

/** Batch and performs same/repeated asynchronous tasks */
export class BatchedTaskExecutor {

  private pendingTasks: Map<string, {
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
    taskFn: TaskFunction<T>,
    options: {
        timeout?: number;
        retries?: number;
    } = {}
  ): Promise<T> {

    // Check if task is already in progress
    if (this.pendingTasks.has(key)) {
        const task = this.pendingTasks.get(key)!;
        return task.promise as Promise<T>;
    }
    
    const promise = new Promise<T>((resolve, reject) => {

        // Handle timeout if any
        const timeoutId = options.timeout 
        ? setTimeout(() => {
            if (this.pendingTasks.has(key)) {
                this.pendingTasks.delete(key);
                reject(new Error(`Request timeout after ${options.timeout}ms`));
            }
            }, options.timeout)
        : null;
        
        const executeTask = async () => {
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
                        await new Promise(resolve => setTimeout(resolve, 1000 * (options.retries! - retriesLeft)));
                    }
                } while (retriesLeft >= 0);
                
                if (!succeeded) {
                    throw new Error("Failed to fetch after retries");
                }
        
                // Clean up and resolve
                this.pendingTasks.delete(key);
                if (timeoutId) clearTimeout(timeoutId);
                resolve(result);
            } catch (error) {
                // Clean up and reject
                this.pendingTasks.delete(key);
                if (timeoutId) clearTimeout(timeoutId);
                reject(error instanceof Error ? error : new Error(String(error)));
            }
        };
        
        // Start the execution
        executeTask();
    });

    this.pendingTasks.set(key, {promise});
    
    return promise;
  }

}
