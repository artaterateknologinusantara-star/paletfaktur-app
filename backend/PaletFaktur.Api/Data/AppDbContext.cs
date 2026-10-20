using Microsoft.EntityFrameworkCore;
using PaletFaktur.Api.Models;

namespace PaletFaktur.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<StockMutation> StockMutations => Set<StockMutation>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<SuratJalan> SuratJalans => Set<SuratJalan>();
    public DbSet<SuratJalanItem> SuratJalanItems => Set<SuratJalanItem>();
    public DbSet<Quotation> Quotations => Set<Quotation>();
    public DbSet<QuotationItem> QuotationItems => Set<QuotationItem>();
    public DbSet<QuotationPhoto> QuotationPhotos => Set<QuotationPhoto>();
    public DbSet<CompanySettings> CompanySettings => Set<CompanySettings>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>().HasIndex(u => u.Username).IsUnique();
        modelBuilder.Entity<Product>().HasIndex(p => p.Sku).IsUnique();
        modelBuilder.Entity<Client>().HasIndex(c => c.ClientCode).IsUnique();
        modelBuilder.Entity<Invoice>().HasIndex(i => i.InvoiceNumber).IsUnique();
        modelBuilder.Entity<SuratJalan>().HasIndex(s => s.SuratJalanNumber).IsUnique();

        modelBuilder.Entity<Product>()
            .Property(p => p.UnitPrice).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Invoice>()
            .Property(i => i.Subtotal).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Invoice>()
            .Property(i => i.DppNilaiLain).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Invoice>()
            .Property(i => i.PpnAmount).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Invoice>()
            .Property(i => i.Total).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<InvoiceItem>()
            .Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<InvoiceItem>()
            .Property(i => i.LineTotal).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<SuratJalanItem>()
            .Property(i => i.Quantity).HasColumnType("decimal(18,2)");

        modelBuilder.Entity<Quotation>().HasIndex(q => q.QuotationNumber).IsUnique();
        modelBuilder.Entity<Quotation>().Property(q => q.Total).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuotationItem>().Property(i => i.UnitPrice).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<QuotationItem>().Property(i => i.LineTotal).HasColumnType("decimal(18,2)");
        modelBuilder.Entity<Quotation>()
            .HasOne(q => q.Client).WithMany().HasForeignKey(q => q.ClientId).OnDelete(DeleteBehavior.SetNull);
        modelBuilder.Entity<QuotationItem>()
            .HasOne(i => i.Quotation).WithMany(q => q.Items).HasForeignKey(i => i.QuotationId).OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<CompanySettings>()
            .Property(c => c.PpnRate).HasColumnType("decimal(5,4)");

        modelBuilder.Entity<Invoice>()
            .HasOne(i => i.Client)
            .WithMany(c => c.Invoices)
            .HasForeignKey(i => i.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(ii => ii.Invoice)
            .WithMany(i => i.Items)
            .HasForeignKey(ii => ii.InvoiceId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<InvoiceItem>()
            .HasOne(ii => ii.Product)
            .WithMany()
            .HasForeignKey(ii => ii.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SuratJalan>()
            .HasOne(s => s.Invoice)
            .WithMany(i => i.SuratJalans)
            .HasForeignKey(s => s.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<SuratJalan>()
            .HasOne(s => s.Client)
            .WithMany()
            .HasForeignKey(s => s.ClientId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SuratJalanItem>()
            .HasOne(si => si.SuratJalan)
            .WithMany(s => s.Items)
            .HasForeignKey(si => si.SuratJalanId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<StockMutation>()
            .HasOne(sm => sm.Product)
            .WithMany(p => p.StockMutations)
            .HasForeignKey(sm => sm.ProductId)
            .OnDelete(DeleteBehavior.Cascade);

        // Seed data awal: identitas perusahaan kosong + akun admin default (password: Admin123!)
        modelBuilder.Entity<CompanySettings>().HasData(new CompanySettings
        {
            Id = 1,
            CompanyName = "CV Menjemput Berkah",
            Phone = "081292977009",
            Email = "www.palletplastikpalingmurah.com",
            SignatoryName = "Ach Lukman H",
            SignatoryTitle = "CEO",
            Address = "Jl. Inspeksi Kalimalang Kp. Pasir Iimus RT.008 / 004 Kec. Cikarang Utara Kab. Bekasi",
            BankName = "BCA",
            BankAccountNumber = "12391795817598",
            BankAccountHolder = "CV Menjemput Berkah",
            PpnRate = 0.12m,
            InvoiceDueDays = 30
        });
    }
}
