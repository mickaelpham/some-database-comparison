# Counting members

The `user` has a `locked` boolean attribute that disables the user for all
workspaces. A `member` can also be `suspended` from a specific workspace. So the
definition of an `active` workspace member is someone who's neither `locked` (at
the `user` level) nor `suspended` (at the `workspace` level).

Everyone else is an `inactive` member, i.e., they can be `locked`, `suspended`,
or both.

# Performance

Before adding indexes to the collection, with the following numbers:

```ts
const MAX_MEMBERS_PER_WORKSPACE = 100
const MAX_USERS = 10_000
const MAX_WORKSPACES = 100
```

I'm getting an avg of **350 ms** to count the members.

Let me add the following indexes and see if we can do better.

```
index workspace by ID
index user by ID
index workspaceMember by workspaceId, userId
```

Adding those indexes dramatically improved the query, I'm getting an average
response time of below **10 ms** now.

Let me crank the number by 10x.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 1_000
const MAX_USERS = 100_0000
const MAX_WORKSPACES = 1_000
```

Now it takes almost **35 seconds** per workspace to count the members, but
adding the indexes back reduces this to an average response time of below **60
ms**. Quite the difference.

Now let's revamp the code a bit to avoid the memory issue and store 10x again
the number of users, workspaces, and the members.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 10_000
const MAX_USERS = 1_000_000
const MAX_WORKSPACES = 10_000
```

With that many members, the data takes around **600–700 ms** which is kinda slow
but still better than before. Let's try with the actual 40k users.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000
const MAX_USERS_TO_INSERT = 10_000
```

This took a lot longer to process, and the index for `workspaceMembers` is at
more than 13 GB on my machine! But it does work and it takes "only" **2500 ms**
on average to return the result of the computation. So this will work with the
40k members workspace challenge, but now I'm curious what does it take for
PostgreSQL to do the same thing?
