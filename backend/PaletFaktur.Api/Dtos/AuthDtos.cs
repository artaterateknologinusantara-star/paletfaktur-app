namespace PaletFaktur.Api.Dtos;

public record LoginRequest(string Username, string Password);
public record LoginResponse(string Token, string Username, string FullName, string Role, DateTime ExpiresAt);
public record ChangePasswordRequest(string OldPassword, string NewPassword);
