Fastify Prefix 옵션 미적용으로 인한 경로 중복 오류
문제 상황

Fastify 애플리케이션에서 fastify.register를 사용해 여러 모듈별 라우트를 등록할 때, 각 모듈에 prefix 옵션을 줬음에도 불구하고 해당 prefix가 적용되지 않는 문제가 발생했습니다. 예를 들어 다음과 같이 라우트 플러그인을 등록했다고 가정합니다:

app.register(authRoutes, { prefix: '/api/auth' });
app.register(componentRoutes, { prefix: '/api/components' });
app.register(projectRoutes, { prefix: '/api/projects' });
app.register(pageRoutes, { prefix: '/api/pages' });
app.register(eventRoutes, { prefix: '/api/events' });


각 모듈(authRoutes, eventRoutes 등) 내부에서는 상대 경로로 라우트를 정의하여, 예를 들어 eventRoutes 안에서는 fastify.post('/', ...)와 같이 /api/events/ 경로에 대응하는 핸들러를 작성했습니다. 하지만 실행 결과 Fastify가 prefix를 인식하지 못하고 모든 모듈의 경로를 루트(/)로 취급해 버렸습니다. 그 결과 서로 다른 모듈에 정의된 POST / 경로들이 충돌하여 “Method 'POST' already declared for route '/'” 같은 경로 및 메서드 중복 에러가 발생했습니다.

원인

이 현상의 주요 원인은 Fastify의 prefix 옵션이 특정 상황에서 무시되기 때문입니다. 구체적으로, 라우트 모듈을 Fastify 플러그인(fastify-plugin)으로 래핑하여 등록한 경우, fastify.register에 전달한 prefix 옵션이 적용되지 않습니다
fastify.dev
fastify.dev
. Fastify는 기본적으로 register를 호출할 때 새로운 플러그인 스코프를 만들어 그 내부에서 정의된 경로들에 prefix를 자동으로 붙여줍니다. 따라서 서로 다른 모듈에서 동일한 경로('/' 등)를 사용해도 prefix가 다르면 충돌 없이 동작합니다
fastify.dev
. 그러나 fastify-plugin으로 플러그인을 감싸면 새로운 스코프를 만들지 않고 상위 컨텍스트를 공유하는 형태가 되는데, 이 경우 Fastify가 제공하는 prefix 옵션이 무시되어 모든 경로가 전역으로 등록됩니다
fastify.dev
. 그 결과 위 사례처럼 각 모듈의 '/' 경로가 prefix 없이 모두 루트로 병합되어 중복 오류가 나는 것입니다.

요약하면, fastify-plugin 사용으로 인해 prefix 옵션이 무시되어 발생한 문제입니다. Fastify 공식 문서에서도 *"fastify-plugin으로 래핑된 라우트에는 prefix 옵션이 동작하지 않는다"*고 명시하고 있습니다
fastify.dev
.

해결 방법

이 문제를 해결하려면 prefix 옵션이 제대로 적용되도록 플러그인 구조를 조정해야 합니다. 다음과 같은 두 가지 접근법을 사용할 수 있습니다:

1) 라우트 모듈에서 fastify-plugin을 제거: 가장 간단한 해결책은 각 라우트 모듈(eventRoutes 등)을 일반적인 Fastify 플러그인 함수 형태로 экспорт하고, fastify-plugin으로 감싸지 않는 것입니다. 예를 들어 TypeScript/ESM 환경이라도 별도로 fp(...)로 감쌀 필요 없이, export default async function routes(fastify, opts) { ... } 형태로 두면 fastify.register 시 자동으로 새로운 스코프가 생성되고 prefix 옵션이 적용됩니다. fastify-plugin이 불필요하게 쓰인 경우 이를 제거하면 각 모듈별 prefix가 정상적으로 반영되어 중복 에러가 사라집니다.

2) 플러그인을 다시 한 번 래핑 (workaround): 만약 fastify-plugin을 꼭 사용해야 하는 경우(예: 전역 데코레이터 등록 등으로 인해), 플러그인 안에 다시 플러그인을 등록하는 방식으로 prefix를 적용할 수 있습니다
fastify.dev
. Fastify 문서에서 제시한 예시를 보면, 실제 라우트 정의를 담은 모듈을 별도의 플러그인으로 감싸서 그 내부에서 prefix 옵션과 함께 등록하고 있습니다
fastify.dev
. 예를 들어 eventRoutes 모듈이 fastify-plugin으로 래핑되어 있다면:

const fp = require('fastify-plugin');
const eventRoutes = require('./eventRoutes'); // 실제 라우트 정의 플러그인

module.exports = fp(async function (app, opts) {
  app.register(eventRoutes, { prefix: '/api/events' });
});


위와 같이 한 단계 더 래핑한 플러그인을 만들고 이를 fastify.register에 등록하면, 내부에서 호출된 app.register(eventRoutes, { prefix: ... })에 의해 prefix가 적용된 하위 스코프가 생성됩니다. 이 방법으로도 각 모듈의 prefix를 강제로 적용할 수 있습니다
fastify.dev
.

위 두 가지 방법 중 **첫 번째 방법(불필요한 fastify-plugin 제거)**이 더 단순하고 권장됩니다. Fastify의 설계 상 라우트를 모듈화할 때는 기본 플러그인 형태만으로도 충분하며, prefix 옵션을 활용한 버전 관리나 경로 그룹핑이 자연스럽게 가능합니다. fastify-plugin은 주로 플러그인 간 스코프 공유(encapsulation 해제)가 필요할 때 쓰는 도구이므로, 일반적인 경로 정의 모듈에는 사용하지 않는 것이 좋습니다. 만약 fastify-plugin을 사용해야 한다면, 앞서 설명한 대로 prefix가 필요한 부분은 별도의 하위 플러그인 스코프에서 등록하도록 구조를 짜야 합니다.

정리하면, Fastify v5.5.x 환경에서 발생한 해당 prefix 문제는 fastify-plugin 사용에 따른 의도된 동작으로서 이미 알려져 있으며
fastify.dev
, 라우트 모듈을 올바르게 구성함으로써 해결할 수 있습니다. 이러한 조치를 취한 후에는 /api/events를 비롯한 각 prefix 경로가 정상적으로 분리되어, 더 이상 경로 충돌 에러 없이 동작할 것입니다.

참고 자료

Fastify 공식 문서: 플러그인 옵션과 prefix 동작
fastify.dev
fastify.dev

Fastify 공식 문서: fastify-plugin 사용 시 prefix 적용 방법 (예제 코드)
fastify.dev
