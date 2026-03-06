export function sanitized(data: any[]) {
  return data.map((a) => ({
    ...a,
    user: (({ password, ...rest }) => rest)(a.user),
  }));
}
