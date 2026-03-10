import http from 'k6/http';
import { sleep, check } from 'k6';

export let options = {
  stages: [
    { duration: '10s', target: 0 }, // start with no users
    { duration: '10s', target: 50000 }, // sudden spike to 500 users
    { duration: '20s', target: 0 }, // drop back to 0
  ],
};

export default function () {
  const params = {
    headers: {
      Authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTEsImVtYWlsIjoiYWJjZGVAZ21haWwuY29tIiwicGhvbmUiOiI5ODM0NTQzNTM0Iiwicm9sZSI6IkFETUlOIiwiY29tcGFueUlkIjoxMSwiaWF0IjoxNzcyMzgxNjY1LCJleHAiOjE3NzI5ODY0NjV9.VaMsFyrRp9e0Pe9gi2N0ZggJT64n1Lxj3M7xfBhvccI',
    },
  };

  const res = http.get('http://localhost:5001/api/v1/attendances', params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(Math.random() * 0.5); // small random delay to avoid exact same millisecond requests
}
