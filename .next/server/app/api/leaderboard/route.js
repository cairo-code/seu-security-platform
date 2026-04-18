"use strict";(()=>{var e={};e.id=7414,e.ids=[7414],e.modules={53524:e=>{e.exports=require("@prisma/client")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},4205:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>R,patchFetch:()=>g,requestAsyncStorage:()=>E,routeModule:()=>l,serverHooks:()=>m,staticGenerationAsyncStorage:()=>c});var s={};t.r(s),t.d(s,{GET:()=>p});var a=t(12085),u=t(31650),n=t(85980),i=t(30627),o=t(76234),d=t(14912);async function p(e){try{let r,t;let s=await (0,o.mk)(e),a=new URL(e.url),u=a.searchParams.get("scope")||"global",n=a.searchParams.get("groupId"),p=Math.min(parseInt(a.searchParams.get("limit")||"20",10),100),l=parseInt(a.searchParams.get("page")||"1",10);if("group"===u&&!n)return i.NextResponse.json({error:"groupId is required for group scope"},{status:400});if("group"===u&&n&&!await d.prisma.groupMember.findFirst({where:{groupId:n,userId:s.sub}}))return i.NextResponse.json({error:"Not a member of this group"},{status:403});let E=(l-1)*p,c=0;if("global"===u){r=await d.prisma.$queryRaw`
        SELECT
          u.id as "userId",
          u.name,
          u."universityId",
          u.points,
          COUNT(ucp.id) as "completedChallenges",
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM "User" u
        LEFT JOIN "UserChallengeProgress" ucp ON u.id = ucp."userId" AND ucp.status = 'COMPLETED'
        GROUP BY u.id, u.name, u."universityId", u.points
        ORDER BY u.points DESC
        LIMIT ${p} OFFSET ${E}
      `;let e=await d.prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "User"
      `;t=Number(e[0].total);let a=await d.prisma.$queryRaw`
        SELECT rank FROM (
          SELECT id as "userId", ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM "User"
        ) sub WHERE "userId" = ${s.sub}
      `;c=a.length>0?Number(a[0].rank):0}else{if(!n)return i.NextResponse.json({error:"Invalid scope"},{status:400});r=await d.prisma.$queryRaw`
        SELECT
          u.id as "userId",
          u.name,
          u."universityId",
          u.points,
          COUNT(ucp.id) as "completedChallenges",
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM "User" u
        INNER JOIN "GroupMember" gm ON u.id = gm."userId"
        LEFT JOIN "UserChallengeProgress" ucp ON u.id = ucp."userId" AND ucp.status = 'COMPLETED'
        WHERE gm."groupId" = ${n}
        GROUP BY u.id, u.name, u."universityId", u.points
        ORDER BY u.points DESC
        LIMIT ${p} OFFSET ${E}
      `;let e=await d.prisma.$queryRaw`
        SELECT COUNT(DISTINCT u.id) as total
        FROM "User" u
        INNER JOIN "GroupMember" gm ON u.id = gm."userId"
        WHERE gm."groupId" = ${n}
      `;t=Number(e[0].total);let a=await d.prisma.$queryRaw`
        SELECT rank FROM (
          SELECT u.id as "userId", ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
          FROM "User" u
          INNER JOIN "GroupMember" gm ON u.id = gm."userId"
          WHERE gm."groupId" = ${n}
        ) sub WHERE "userId" = ${s.sub}
      `;c=a.length>0?Number(a[0].rank):0}return i.NextResponse.json({leaderboard:r.map(e=>({rank:Number(e.rank),userId:e.userId,name:e.name,universityId:e.universityId,points:e.points,completedChallenges:Number(e.completedChallenges)})),total:t,page:l,callerRank:c})}catch(e){if(e instanceof o.l4)return i.NextResponse.json({error:e.message},{status:e.statusCode});throw e}}let l=new a.AppRouteRouteModule({definition:{kind:u.x.APP_ROUTE,page:"/api/leaderboard/route",pathname:"/api/leaderboard",filename:"route",bundlePath:"app/api/leaderboard/route"},resolvedPagePath:"/home/freddy/seu-security-platform/app/api/leaderboard/route.ts",nextConfigOutput:"standalone",userland:s}),{requestAsyncStorage:E,staticGenerationAsyncStorage:c,serverHooks:m}=l,R="/api/leaderboard/route";function g(){return(0,n.patchFetch)({serverHooks:m,staticGenerationAsyncStorage:c})}},45751:(e,r,t)=>{t.d(r,{A$:()=>d,ab:()=>p,ez:()=>l,si:()=>E});var s=t(89125),a=t(78206);let u=process.env.JWT_SECRET,n=process.env.JWT_REFRESH_SECRET;(function(){if(!u||u.length<32)throw Error("JWT_SECRET must be at least 32 characters");if(!n||n.length<32)throw Error("JWT_REFRESH_SECRET must be at least 32 characters")})();let i=new TextEncoder().encode(process.env.JWT_SECRET),o=new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);async function d(e){return new s.N({sub:e.sub,role:e.role,universityId:e.universityId}).setProtectedHeader({alg:"HS256"}).setExpirationTime("15m").setSubject(e.sub).sign(i)}async function p(e){return new s.N({sub:e.sub}).setProtectedHeader({alg:"HS256"}).setExpirationTime("7d").setSubject(e.sub).sign(o)}async function l(e){let{payload:r}=await (0,a._)(e,i);if(!r.sub||!r.role||!r.universityId)throw Error("Invalid token payload");return r}async function E(e){let{payload:r}=await (0,a._)(e,o);if(!r.sub)throw Error("Invalid token payload");return r}},76234:(e,r,t)=>{t.d(r,{MH:()=>n,l4:()=>a,mk:()=>u,oL:()=>i});var s=t(45751);class a extends Error{constructor(e,r){super(e),this.name="AuthError",this.statusCode=r}}async function u(e){let r=e.headers.get("Authorization");if(!r||!r.startsWith("Bearer "))throw new a("Unauthorized",401);let t=r.slice(7);try{return await (0,s.ez)(t)}catch{throw new a("Invalid or expired token",401)}}function n(...e){return async r=>{let t=await u(r);if(!e.includes(t.role))throw new a("Forbidden",403);return t}}async function i(e,...r){let t=await (0,s.ez)(e);if(!r.includes(t.role))throw new a("Forbidden",403);return t}},14912:(e,r,t)=>{t.d(r,{prisma:()=>a});var s=t(53524);let a=globalThis.prisma??new s.PrismaClient}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[6522,8247,6317],()=>t(4205));module.exports=s})();