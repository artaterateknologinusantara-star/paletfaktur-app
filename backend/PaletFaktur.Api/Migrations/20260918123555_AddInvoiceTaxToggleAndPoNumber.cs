using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PaletFaktur.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceTaxToggleAndPoNumber : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "ApplyTax",
                table: "Invoices",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "PoNumber",
                table: "Invoices",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "InvoiceItems",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ApplyTax",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "PoNumber",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "InvoiceItems");
        }
    }
}
