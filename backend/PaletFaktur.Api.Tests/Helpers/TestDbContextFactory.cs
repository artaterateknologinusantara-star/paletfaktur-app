using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Data;

namespace PaletFaktur.Api.Tests.Helpers;

public static class TestDbContextFactory
{
    /// <summary>Database InMemory baru dengan nama unik per panggilan, supaya tiap test terisolasi.</summary>
    public static AppDbContext Create()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new AppDbContext(options);
    }
}
