export class SignUpRequest {
  name: string;
  email: string;
  password: string;

  constructor({ name, email, password }: { name: string; email: string; password: string }) {
    this.name = name;
    this.email = email;
    this.password = password;
  }

  // basic client-side validation
  validate() {
    if (!this.name || !this.name.trim()) throw new Error("Name is required");
    if (!this.email || !this.email.trim()) throw new Error("Email is required");
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) throw new Error("Invalid email format");
    if (!this.password) throw new Error("Password is required");
    if (this.password.length < 8) throw new Error("Password must be at least 8 characters");
    // Password complexity: at least one uppercase, one lowercase, one digit, one special character
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;
    if (!complexityRegex.test(this.password)) {
      throw new Error("Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
    }
    return true;
  }
}
