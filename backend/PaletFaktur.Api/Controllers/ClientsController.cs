using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;
using PaletFaktur.Api.Dtos;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClientsController(AppDbContext db)
    {
        _db = db;
    }

    private static ClientResponse ToResponse(Client c) => new(
        c.Id, c.ClientCode, c.Name, c.Email, c.Phone, c.Address, c.IsActive, c.CreatedAt);

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ClientResponse>>> GetAll([FromQuery] string? search)
    {
        var query = _db.Clients.Where(c => c.IsActive).AsQueryable();
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.Name.Contains(search) || (c.Email != null && c.Email.Contains(search)));
        }
        var clients = await query.OrderBy(c => c.Id).ToListAsync();
        return Ok(clients.Select(ToResponse));
    }

    [HttpPost]
    public async Task<ActionResult<ClientResponse>> Create(ClientCreateRequest request)
    {
        var nextIndex = await _db.Clients.CountAsync() + 1;
        var client = new Client
        {
            ClientCode = $"CLT-{nextIndex}",
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            Address = request.Address
        };
        _db.Clients.Add(client);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetAll), ToResponse(client));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var client = await _db.Clients.FindAsync(id);
        if (client is null) return NotFound();
        client.IsActive = false;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}
