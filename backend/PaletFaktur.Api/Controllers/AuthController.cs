using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Services;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtTokenService _jwt;

    public AuthController(AppDbContext db, JwtTokenService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Username == request.Username);
        if (user is null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
        {
            return Unauthorized(new { message = "Username atau password salah." });
        }

        var (token, expiresAt) = _jwt.GenerateToken(user);
        return Ok(new LoginResponse(token, user.Username, user.FullName, user.Role, expiresAt));
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword(ChangePasswordRequest request)
    {
        var uid = User.FindFirst("uid")?.Value;
        if (uid is null || !int.TryParse(uid, out var userId))
        {
            return Unauthorized();
        }

        var user = await _db.Users.FindAsync(userId);
        if (user is null) return Unauthorized();

        if (!BCrypt.Net.BCrypt.Verify(request.OldPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Password lama tidak sesuai." });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "Password baru minimal 6 karakter." });
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await _db.SaveChangesAsync();

        return Ok(new { message = "Password berhasil diubah." });
    }
}
