# README

Just a small application to compare insertion and count between MongoDB and
PostgreSQL.

## Setup

```sh
docker compose up -d
npm i
npm run build
```

Add the configuration to the environment variables.

```sh
cp .env.sample .env
```

Then run the scripts in `dist/scripts/pg` or `dist/scripts/mongo` to populate
the test data.

# Using MongoDB

## Counting members

The `user` has a `locked` boolean attribute that disables the user for all
workspaces. A `member` can also be `suspended` from a specific workspace. So the
definition of an `active` workspace member is someone who's neither `locked` (at
the `user` level) nor `suspended` (at the `workspace` level).

Everyone else is an `inactive` member, i.e., they can be `locked`, `suspended`,
or both.

## Performance

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
const MAX_USERS = 1_000_000
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

# Using PostgreSQL

```
docker compose exec postgres psql -U learn
```

```ts
const MAX_MEMBERS_PER_WORKSPACE = 100
const MAX_USERS = 10_000
const MAX_WORKSPACES = 100
```

Slowest was **4 ms** for a workspace. It's about twice as fast as Mongo but the
insertion was a lot slower (because I do the insert one row at a time).

Let's crank the numbers by 10x.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 1_000
const MAX_USERS = 1_000_0000
const MAX_WORKSPACES = 1_000
```

Blazing fast, we stay under **5 ms** this time.

Let's finish up the number by going another 10x.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000
```

Here, we got nowhere unfortunately. Probably need some tuning, but after running
the computer for 10+ hours, there was only 40M records inserted in the
`workspace_members` (out of 400M, so 10% inserted). The insertion is really
slow.

Also the performance to count them is also kinda slow, with some count going
over **500 ms**. So if it's slowing down that much then maybe it will be even
slower with the rest of the records. So the tl;dr is that PostgreSQL was good
until it wasn't, whereas MongoDB had a more linear latency deterioration.

## Refactor update and hardware change

After I refactored the code and run it on the M2 laptop from work, I managed to
insert the following numbers into PostgreSQL.

```ts
const MAX_MEMBERS_PER_WORKSPACE = 40_000
const MAX_USERS = 5_000_000
const MAX_WORKSPACES = 10_000
```

Note that the docker volume is now a whooping 28.8 GB in Docker Desktop
dashboard! Running the following command to get the size information:

```sql
SELECT pg_size_pretty(pg_relation_size('workspaces'))
```

| table or index              | size   |
| --------------------------- | ------ |
| `workspaces`                | 544 kB |
| `users`                     | 290 MB |
| `workspace_members`         | 16 GB  |
| indexes `workspaces`        | 240 kB |
| indexes `users`             | 107 MB |
| indexes `workspace_members` | 11 GB  |

Running the count on the M2 consistently returns count results in less then
**200 ms** but that might just be a hardware upgrade. I can try running on my
Intel back at home.

For **MonboDB** running on the M2, the performances were fastter, but it's still
slower thank PostgresL, with some running at over **900 ms** and a lot around
**600 ms**.
