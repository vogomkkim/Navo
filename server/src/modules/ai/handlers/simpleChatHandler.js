export async function handleSimpleChat(request, reply) {
  try {
    const { message } = request.body;

    // 간단한 응답 로직
    const response = {
      message: `안녕하세요! "${message}"에 대한 응답입니다.`,
      timestamp: new Date().toISOString()
    };

    reply.send({
      ok: true,
      data: response
    });
  } catch (error) {
    reply.status(500).send({
      ok: false,
      error: '채팅 처리 중 오류가 발생했습니다.'
    });
  }
}
