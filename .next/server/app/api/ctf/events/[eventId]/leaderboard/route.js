"use strict";(()=>{var e={};e.id=5796,e.ids=[5796],e.modules={53524:e=>{e.exports=require("@prisma/client")},20399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},30517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},14019:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>v,patchFetch:()=>h,requestAsyncStorage:()=>E,routeModule:()=>m,serverHooks:()=>C,staticGenerationAsyncStorage:()=>p});var n={};r.r(n),r.d(n,{GET:()=>l});var s=r(12085),a=r(31650),i=r(85980),o=r(30627),u=r(76234),d=r(14912),c=r(87878);async function l(e,{params:t}){try{let r=await (0,u.mk)(e),{eventId:n}=await t,s=new URL(e.url).searchParams.get("scope")||"individual";if(await (0,c.nA)(n,r.sub,r.role,!0),"individual"===s){let e=await d.prisma.$queryRaw`
        SELECT
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.points), 0) DESC) AS rank,
          u.id AS "userId",
          u.name,
          u."universityId",
          COALESCE(SUM(c.points), 0)::int AS score,
          COUNT(s.id)::int AS "solvedCount"
        FROM "User" u
        LEFT JOIN "Submission" s ON s."userId" = u.id AND s."isCorrect" = true
        LEFT JOIN "CTFEventChallenge" ec ON ec."challengeId" = s."challengeId"
        LEFT JOIN "Challenge" c ON c.id = s."challengeId"
        WHERE ec."eventId" = ${n}
        GROUP BY u.id, u.name, u."universityId"
        HAVING COUNT(s.id) > 0
        ORDER BY score DESC, "solvedCount" DESC
      `,t=e.find(e=>e.userId===r.sub),s=t?t.rank:null;return o.NextResponse.json({rankings:e.map(e=>({rank:Number(e.rank),userId:e.userId,name:e.name,universityId:e.universityId,score:Number(e.score),solvedCount:Number(e.solvedCount)})),userRank:s})}let a=await d.prisma.$queryRaw`
      SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.points), 0) DESC) AS rank,
        t.id AS "teamId",
        t.name AS "teamName",
        COUNT(DISTINCT tm."userId")::int AS "memberCount",
        COALESCE(SUM(c.points), 0)::int AS score,
        COUNT(DISTINCT s."challengeId")::int AS "solvedCount"
      FROM "CTFTeam" t
      JOIN "CTFTeamMember" tm ON tm."teamId" = t.id
      LEFT JOIN "Submission" s ON s."userId" = tm."userId" AND s."isCorrect" = true
      LEFT JOIN "CTFEventChallenge" ec ON ec."challengeId" = s."challengeId"
      LEFT JOIN "Challenge" c ON c.id = s."challengeId"
      WHERE t."eventId" = ${n}
      GROUP BY t.id, t.name
      HAVING COUNT(s.id) > 0
      ORDER BY score DESC, "solvedCount" DESC
    `,i=await d.prisma.cTFTeamMember.findFirst({where:{userId:r.sub,team:{eventId:n}},include:{team:{select:{id:!0}}}}),l=i?a.find(e=>e.teamId===i.team.id):null,m=l?l.rank:null;return o.NextResponse.json({rankings:a.map(e=>({rank:Number(e.rank),teamId:e.teamId,teamName:e.teamName,memberCount:Number(e.memberCount),score:Number(e.score),solvedCount:Number(e.solvedCount)})),userRank:m})}catch(e){if(e instanceof u.l4)return o.NextResponse.json({error:e.message},{status:e.statusCode});throw e}}let m=new s.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/ctf/events/[eventId]/leaderboard/route",pathname:"/api/ctf/events/[eventId]/leaderboard",filename:"route",bundlePath:"app/api/ctf/events/[eventId]/leaderboard/route"},resolvedPagePath:"/home/freddy/seu-security-platform/app/api/ctf/events/[eventId]/leaderboard/route.ts",nextConfigOutput:"standalone",userland:n}),{requestAsyncStorage:E,staticGenerationAsyncStorage:p,serverHooks:C}=m,v="/api/ctf/events/[eventId]/leaderboard/route";function h(){return(0,i.patchFetch)({serverHooks:C,staticGenerationAsyncStorage:p})}},45751:(e,t,r)=>{r.d(t,{A$:()=>d,ab:()=>c,ez:()=>l,si:()=>m});var n=r(89125),s=r(78206);let a=process.env.JWT_SECRET,i=process.env.JWT_REFRESH_SECRET;(function(){if(!a||a.length<32)throw Error("JWT_SECRET must be at least 32 characters");if(!i||i.length<32)throw Error("JWT_REFRESH_SECRET must be at least 32 characters")})();let o=new TextEncoder().encode(process.env.JWT_SECRET),u=new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);async function d(e){return new n.N({sub:e.sub,role:e.role,universityId:e.universityId}).setProtectedHeader({alg:"HS256"}).setExpirationTime("15m").setSubject(e.sub).sign(o)}async function c(e){return new n.N({sub:e.sub}).setProtectedHeader({alg:"HS256"}).setExpirationTime("7d").setSubject(e.sub).sign(u)}async function l(e){let{payload:t}=await (0,s._)(e,o);if(!t.sub||!t.role||!t.universityId)throw Error("Invalid token payload");return t}async function m(e){let{payload:t}=await (0,s._)(e,u);if(!t.sub)throw Error("Invalid token payload");return t}},76234:(e,t,r)=>{r.d(t,{MH:()=>i,l4:()=>s,mk:()=>a,oL:()=>o});var n=r(45751);class s extends Error{constructor(e,t){super(e),this.name="AuthError",this.statusCode=t}}async function a(e){let t=e.headers.get("Authorization");if(!t||!t.startsWith("Bearer "))throw new s("Unauthorized",401);let r=t.slice(7);try{return await (0,n.ez)(r)}catch{throw new s("Invalid or expired token",401)}}function i(...e){return async t=>{let r=await a(t);if(!e.includes(r.role))throw new s("Forbidden",403);return r}}async function o(e,...t){let r=await (0,n.ez)(e);if(!t.includes(r.role))throw new s("Forbidden",403);return r}},87878:(e,t,r)=>{r.d(t,{CH:()=>i,nA:()=>a});var n=r(14912);class s extends Error{constructor(e,t,r){super(e),this.name="CTFAccessError",this.statusCode=t,this.metadata=r}}async function a(e,t,r,a=!1){let i=await n.prisma.cTFEvent.findUnique({where:{id:e}});if(!i)throw new s("Event not found",404);let o="ADMIN"===r||"TEACHER"===r;if(!i.isPublished&&!o)throw new s("Event not published",403);let u=new Date;if(!a&&!o){if(i.startsAt>u)throw new s("Event not started",403,{startsAt:i.startsAt.toISOString()});if(i.endsAt<u)throw new s("Event ended",403,{endsAt:i.endsAt.toISOString()})}return i}async function i(e,t){let r=await n.prisma.cTFTeamMember.findFirst({where:{userId:t,team:{eventId:e}},include:{team:{select:{id:!0,name:!0,inviteCode:!0}}}});return r?.team??null}},14912:(e,t,r)=>{r.d(t,{prisma:()=>s});var n=r(53524);let s=globalThis.prisma??new n.PrismaClient}};var t=require("../../../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),n=t.X(0,[6522,8247,6317],()=>r(14019));module.exports=n})();