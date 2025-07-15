import { jwtDecode } from 'jwt-decode';

interface GoogleJWT {
  name: string;
  email: string;
  picture: string;
}

export default function handleCredentialResponse(response: any) {
  try {
    const decoded: GoogleJWT = jwtDecode(response.credential);
    return {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture
    };
  } catch (err) {
    console.error('Failed to decode Google credential:', err);
    return null;
  }
}
