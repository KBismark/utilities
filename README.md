# utilities
Opinionated  JavaScript Utilities

## List    
- [Batched Task Executer](https://github.com/KBismark/utilities/blob/master/src/batch_task_executer.ts) : Batches and executes similar tasks once for all. 
> ```ts
> const performer = new BatchedTaskExecutor;
> 
> const getUsers = async ()=>{
>    try {
>        return await performer.perfromTask('get_users', async () => [], {retries: 2, timeout: 1000});
>    } catch (error) {
>        return null
>    } 
> }
>
> app.get('/users', async (req, res)=>{
>    const users = await getUsers();
>    // rest of code here..
> })
>

